import { db } from "@/lib/db";
import { verifyStudentToken } from "@/lib/student-auth";

function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(name + "="))
    ?.split("=")[1];
}

function normalizePersistedAnswer(answer, questionType) {
  const normalizedType = String(questionType || "").toLowerCase();
  const isMulti =
    normalizedType === "mcq" ||
    normalizedType === "msq" ||
    normalizedType === "multiple" ||
    normalizedType === "multiple_choice";

  if (isMulti) {
    const values = Array.isArray(answer) ? answer : answer == null ? [] : [answer];
    return values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  }

  const numericValue = Number(answer);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function seededScore(seedText, value) {
  const source = `${seedText}:${value}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export async function GET(req, { params }) {
  try {
    const { id: examId } = await params;
    const token = getCookie(req, "student_token");

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = verifyStudentToken(token);

    const [[studentRow]] = await db.query(
      `
      SELECT CONCAT_WS(' ', first_name, last_name) AS student_name
      FROM students
      WHERE id = ?
      LIMIT 1
      `,
      [student.id]
    );

    const [[exam]] = await db.query(
      `
      SELECT
        e.id,
        e.title,
        e.duration_minutes,
        e.status,
        e.start_time,
        e.end_time,
        ep.allow_section_switch,
        ep.allow_review,
        ep.shuffle_questions,
        ep.shuffle_options,
        ep.negative_marking,
        ep.show_result_after_submit
      FROM exams e
      LEFT JOIN exam_patterns ep ON ep.exam_id = e.id
      WHERE e.id = ?
      LIMIT 1
      `,
      [examId]
    );

    if (!exam || exam.status !== "published") {
      return Response.json({ message: "Exam not found" }, { status: 404 });
    }

    let [[attempt]] = await db.query(
      `
      SELECT *
      FROM exam_attempts
      WHERE exam_id = ? AND student_id = ?
      LIMIT 1
      `,
      [examId, student.id]
    );

    if (attempt?.status === "submitted") {
      return Response.json(
        { message: "Attempt already submitted" },
        { status: 409 }
      );
    }

    const [[durationRow]] = await db.query(
      `
      SELECT COALESCE(SUM(eps.duration_minutes), 0) AS total_minutes
      FROM exam_pattern_sections eps
      JOIN exam_patterns ep ON eps.exam_pattern_id = ep.id
      WHERE ep.exam_id = ?
      `,
      [examId]
    );

    const totalSeconds = Math.max(
      Number(durationRow?.total_minutes || 0) * 60,
      Number(exam.duration_minutes || 0) * 60
    );

    if (!attempt) {
      await db.query(
        `
        INSERT INTO exam_attempts
          (exam_id, student_id, start_time, status, remaining_seconds, last_activity)
        VALUES (?, ?, NOW(), 'in_progress', ?, NOW())
        `,
        [examId, student.id, totalSeconds]
      );

      [[attempt]] = await db.query(
        `SELECT * FROM exam_attempts WHERE exam_id = ? AND student_id = ? LIMIT 1`,
        [examId, student.id]
      );
    }

    let timeLeft = Number(attempt.remaining_seconds);
    if (!Number.isFinite(timeLeft) || timeLeft <= 0) {
      const spentSeconds = Math.floor(
        (Date.now() - new Date(attempt.start_time).getTime()) / 1000
      );
      timeLeft = Math.max(totalSeconds - spentSeconds, 0);
    }

    const [rows] = await db.query(
      `
      SELECT
        esq.section_id,
        eps.section_name,
        eps.duration_minutes,
        q.id AS question_id,
        q.question_text,
        q.question_type,
        qo.id AS option_id,
        qo.option_text
      FROM exam_section_questions esq
      JOIN exam_pattern_sections eps ON esq.section_id = eps.id
      JOIN exam_patterns ep ON eps.exam_pattern_id = ep.id
      JOIN questions q ON esq.question_id = q.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE ep.exam_id = ?
      ORDER BY esq.section_id, q.id, qo.id
      `,
      [examId]
    );

    const sectionMap = new Map();

    for (const row of rows) {
      if (!sectionMap.has(row.section_id)) {
        sectionMap.set(row.section_id, {
          id: row.section_id,
          section_name: row.section_name,
          duration_minutes: row.duration_minutes,
          questions: [],
        });
      }

      const section = sectionMap.get(row.section_id);
      let question = section.questions.find((item) => item.id === row.question_id);

      if (!question) {
        question = {
          id: row.question_id,
          question_text: row.question_text,
          question_type: String(row.question_type || "").toLowerCase(),
          options: [],
        };
        section.questions.push(question);
      }

      if (row.option_id) {
        question.options.push({
          id: row.option_id,
          option_text: row.option_text,
        });
      }
    }

    const sectionLookup = new Map();
    for (const section of sectionMap.values()) {
      if (Number(exam.shuffle_questions ?? 0) === 1) {
        section.questions.sort((a, b) => {
          const left = seededScore(`${attempt.id}-${section.id}-q`, a.id);
          const right = seededScore(`${attempt.id}-${section.id}-q`, b.id);
          return left - right;
        });
      }

      for (const question of section.questions) {
        if (Number(exam.shuffle_options ?? 0) === 1) {
          question.options.sort((a, b) => {
            const left = seededScore(`${attempt.id}-${section.id}-${question.id}-o`, a.id);
            const right = seededScore(`${attempt.id}-${section.id}-${question.id}-o`, b.id);
            return left - right;
          });
        }
        sectionLookup.set(`${section.id}-${question.id}`, question.question_type);
      }
    }

    let persistedAnswers = {};
    let persistedQuestionTimes = {};
    try {
      persistedAnswers = attempt.answers_json ? JSON.parse(attempt.answers_json) : {};
    } catch {
      persistedAnswers = {};
    }
    try {
      persistedQuestionTimes = attempt.question_time_json
        ? JSON.parse(attempt.question_time_json)
        : {};
    } catch {
      persistedQuestionTimes = {};
    }
    const normalizedAnswers = Object.fromEntries(
      Object.entries(persistedAnswers).map(([key, value]) => [
        key,
        normalizePersistedAnswer(value, sectionLookup.get(key)),
      ])
    );

    return Response.json({
      exam_name: exam.title,
      student_name: studentRow?.student_name?.trim() || "Student",
      sections: Array.from(sectionMap.values()),
      answers: normalizedAnswers,
      question_times: persistedQuestionTimes,
      timeLeft,
      current_section_id: attempt.current_section_id,
      pattern: {
        allow_section_switch: Number(exam.allow_section_switch ?? 1),
        allow_review: Number(exam.allow_review ?? 1),
        shuffle_questions: Number(exam.shuffle_questions ?? 0),
        shuffle_options: Number(exam.shuffle_options ?? 0),
        negative_marking: Number(exam.negative_marking ?? 0),
        show_result_after_submit: Number(exam.show_result_after_submit ?? 0),
      },
    });
  } catch (err) {
    console.error("ATTEMPT_GET_ERROR:", err);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
