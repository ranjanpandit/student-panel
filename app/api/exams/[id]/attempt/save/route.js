import { db } from "@/lib/db";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  return cookieHeader
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(name + "="))
    ?.split("=")[1];
}

export async function POST(req, { params }) {
  try {
    const { id: examId } =await params;
    const { sectionId, questionId, answer, timeLeft } = await req.json();

    const token = getCookie(req, "student_token");
    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = jwt.verify(token, SECRET);

    const [[attempt]] = await db.query(
      `
      SELECT id, answers_json
      FROM exam_attempts
      WHERE exam_id = ?
        AND student_id = ?
        AND status = 'in_progress'
      LIMIT 1
      `,
      [examId, student.id]
    );

    if (!attempt) {
      return Response.json(
        { message: "No active attempt" },
        { status: 400 }
      );
    }

    let answers = {};
    if (attempt.answers_json) {
      try {
        answers = JSON.parse(attempt.answers_json);
      } catch {}
    }

    const key = `${sectionId}-${questionId}`;
    answers[key] = answer;

    await db.query(
      `
      UPDATE exam_attempts
      SET
        answers_json = ?,
        current_section_id = ?,
        remaining_seconds = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        JSON.stringify(answers),
        sectionId,
        timeLeft,
        attempt.id,
      ]
    );

    return Response.json({ success: true });

  } catch (err) {
    console.error("SAVE ANSWER ERROR:", err);
    return Response.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}
