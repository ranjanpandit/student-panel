import { db } from "@/lib/db";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

/* ===== SAFE COOKIE READER ===== */
function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  return cookieHeader
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(name + "="))
    ?.split("=")[1];
}

export async function GET(req, { params }) {
  try {
    const { id: examId } = await params;

    /* =========================
       AUTH
    ========================== */
    const token = getCookie(req, "student_token");
    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = jwt.verify(token, SECRET);

    /* =========================
       GET OR CREATE ATTEMPT
    ========================== */
    let [[attempt]] = await db.query(
      `
      SELECT *
      FROM exam_attempts
      WHERE exam_id = ?
        AND student_id = ?
        AND status = 'in_progress'
      LIMIT 1
      `,
      [examId, student.id]
    );

    if (!attempt) {
      // Create attempt
      const [[durationRow]] = await db.query(
        `
        SELECT SUM(eps.duration_minutes) AS total_minutes
        FROM exam_pattern_sections eps
        JOIN exam_patterns ep ON eps.exam_pattern_id = ep.id
        WHERE ep.exam_id = ?
        `,
        [examId]
      );

      const totalSeconds = (durationRow?.total_minutes || 0) * 60;

      await db.query(
        `
        INSERT INTO exam_attempts
          (exam_id, student_id, start_time, status, remaining_seconds)
        VALUES (?, ?, NOW(), 'in_progress', ?)
        `,
        [examId, student.id, totalSeconds]
      );

      [[attempt]] = await db.query(
        `
        SELECT *
        FROM exam_attempts
        WHERE exam_id = ?
          AND student_id = ?
          AND status = 'in_progress'
        `,
        [examId, student.id]
      );
    }

    /* =========================
       TIME LEFT (ENTERPRISE SAFE)
    ========================== */
    let timeLeft = attempt.remaining_seconds;

    if (timeLeft === null) {
      // Fallback for old records
      const [[durationRow]] = await db.query(
        `
        SELECT SUM(eps.duration_minutes) AS total_minutes
        FROM exam_pattern_sections eps
        JOIN exam_patterns ep ON eps.exam_pattern_id = ep.id
        WHERE ep.exam_id = ?
        `,
        [examId]
      );

      const totalSeconds = (durationRow?.total_minutes || 0) * 60;
      const spentSeconds = Math.floor(
        (Date.now() - new Date(attempt.start_time).getTime()) / 1000
      );

      timeLeft = Math.max(totalSeconds - spentSeconds, 0);
    }

    /* =========================
       FETCH EXAM STRUCTURE
    ========================== */
    const [rows] = await db.query(
      `
      SELECT 
        esq.section_id,
        eps.section_name,
        eps.duration_minutes,
        esq.question_id,
        q.question_text,
        qo.id AS option_id,
        qo.option_text
      FROM exam_section_questions esq
      JOIN exam_pattern_sections eps ON esq.section_id = eps.id
      JOIN exam_patterns ep ON eps.exam_pattern_id = ep.id
      JOIN questions q ON esq.question_id = q.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE ep.exam_id = ?
      ORDER BY esq.section_id, esq.question_id, qo.id
      `,
      [examId]
    );

    /* =========================
       TRANSFORM TO TREE
    ========================== */
    const sectionMap = {};

    for (const r of rows) {
      if (!sectionMap[r.section_id]) {
        sectionMap[r.section_id] = {
          id: r.section_id,
          section_name: r.section_name,
          duration_minutes: r.duration_minutes,
          questions: [],
        };
      }

      let q = sectionMap[r.section_id].questions.find(
        x => x.id === r.question_id
      );

      if (!q) {
        q = {
          id: r.question_id,
          question_text: r.question_text,
          options: [],
        };
        sectionMap[r.section_id].questions.push(q);
      }

      if (r.option_id) {
        q.options.push({
          id: r.option_id,
          option_text: r.option_text,
        });
      }
    }

    return Response.json({
      sections: Object.values(sectionMap),
      answers: attempt.answers_json
        ? JSON.parse(attempt.answers_json)
        : {},
      timeLeft, // 🔥 authoritative
      current_section_id: attempt.current_section_id,
      pattern: { allow_section_switch: 1 },
    });

  } catch (err) {
    console.error("ATTEMPT GET ERROR:", err);
    return Response.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}
