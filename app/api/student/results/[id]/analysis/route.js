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

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const token = getCookie(req, "student_token");

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = verifyStudentToken(token);

    const [[result]] = await db.query(
      `
      SELECT er.*, e.title AS exam_title
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      WHERE er.id = ? AND er.student_id = ?
      `,
      [id, student.id]
    );

    if (!result) {
      return Response.json({ message: "Result not found" }, { status: 404 });
    }

    const [rows] = await db.query(
      `
      SELECT
        ea.section_id,
        eps.section_name,
        q.id AS question_id,
        q.question_type,
        q.question_text,
        q.explanation,
        qo.id AS option_id,
        qo.option_text,
        qo.is_correct,
        ea.selected_option_id,
        ea.selected_option_ids_json,
        ea.is_correct AS student_correct,
        ea.marks_awarded
      FROM exam_answers ea
      LEFT JOIN exam_pattern_sections eps
        ON eps.id = ea.section_id
      JOIN questions q
        ON q.id = ea.question_id
      LEFT JOIN question_options qo
        ON qo.question_id = q.id
      WHERE ea.exam_result_id = ?
      ORDER BY ea.section_id, q.id, qo.id
      `,
      [id]
    );

    const questionMap = new Map();

    rows.forEach((row) => {
      const key = `${row.section_id ?? 0}-${row.question_id}`;

      if (!questionMap.has(key)) {
        questionMap.set(key, {
          id: row.question_id,
          key,
          section_id: row.section_id,
          section_name: row.section_name,
          question_type: row.question_type,
          question_text: row.question_text,
          explanation: row.explanation,
          selected_option_id: row.selected_option_id,
          selected_option_ids: row.selected_option_ids_json
            ? JSON.parse(row.selected_option_ids_json)
            : row.selected_option_id == null
              ? []
              : [row.selected_option_id],
          is_correct: row.student_correct,
          marks_awarded: row.marks_awarded,
          options: [],
        });
      }

      if (row.option_id) {
        questionMap.get(key).options.push({
          id: row.option_id,
          option_text: row.option_text,
          is_correct: row.is_correct,
        });
      }
    });

    return Response.json({
      result,
      questions: Array.from(questionMap.values()),
    });
  } catch (err) {
    console.error("ANALYSIS_API_ERROR:", err);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
