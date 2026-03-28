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
    const { reason } = await req.json();

    const token = getCookie(req, "student_token");
    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = jwt.verify(token, SECRET);

    const [[attempt]] = await db.query(
      `
      SELECT id
      FROM exam_attempts
      WHERE exam_id = ?
        AND student_id = ?
        AND status = 'in_progress'
      LIMIT 1
      `,
      [examId, student.id]
    );
    console.log(`
      SELECT id
      FROM exam_attempts
      WHERE exam_id = ?
        AND student_id = ?
        AND status = 'in_progress'
      LIMIT 1
      `,
      [examId, student.id])

    if (!attempt) {
      return Response.json(
        { message: "No active attempt" },
        { status: 400 }
      );
    }

    await db.query(
      `
      UPDATE exam_attempts
      SET
        status = 'submitted',
        exit_reason = ?,
        remaining_seconds = 0,
        end_time = NOW(),
        updated_at = NOW()
      WHERE id = ?
      `,
      [reason || "MANUAL", attempt.id]
    );

    return Response.json({ success: true });

  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    return Response.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}
