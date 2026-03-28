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
    const {id} = await params;

    /* ================= AUTH ================= */
    const token = getCookie(req, "student_token");
    if (!token)
      return Response.json({ message: "Unauthorized" }, { status: 401 });

    const student = jwt.verify(token, SECRET);

    /* ================= RESULT ================= */
    const [[result]] = await db.query(
      `
      SELECT er.*, e.title AS exam_title
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      WHERE er.id=? AND er.student_id=?
      `,
      [id, student.id]
    );

    if (!result)
      return Response.json({ message: "Result not found" }, { status: 404 });

    /* ================= QUESTION ANALYSIS ================= */
    const [rows] = await db.query(
      `
      SELECT
          esq.section_id,
          eps.section_name,

          q.id AS question_id,
          q.question_text,
          q.explanation,

          qo.id AS option_id,
          qo.option_text,
          qo.is_correct,

          ea.selected_option_id,
          ea.is_correct AS student_correct,
          ea.marks_awarded

      FROM exam_answers ea

      JOIN exam_section_questions esq
          ON esq.question_id = ea.question_id

      JOIN exam_pattern_sections eps
          ON eps.id = esq.section_id

      JOIN questions q
          ON q.id = ea.question_id

      LEFT JOIN question_options qo
          ON qo.question_id = q.id

      WHERE ea.exam_result_id = ?

      ORDER BY esq.section_id, q.id, qo.id
      `,
      [id]
    );

    /* ================= GROUP QUESTIONS ================= */

    const questionMap = {};

    rows.forEach(r => {
      if (!questionMap[r.question_id]) {
        questionMap[r.question_id] = {
          id: r.question_id,
          section_id: r.section_id,
          section_name: r.section_name,
          question_text: r.question_text,
          explanation: r.explanation,
          selected_option_id: r.selected_option_id,
          is_correct: r.student_correct,
          marks_awarded: r.marks_awarded,
          options: [],
        };
      }

      if (r.option_id) {
        questionMap[r.question_id].options.push({
          id: r.option_id,
          option_text: r.option_text,
          is_correct: r.is_correct,
        });
      }
    });

    return Response.json({
      result,
      questions: Object.values(questionMap),
    });

  } catch (err) {
    console.error("ANALYSIS API ERROR:", err);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
