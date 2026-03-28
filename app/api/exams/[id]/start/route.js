import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = "student-secret-key";

export async function POST(req, { params }) {
  const { id: examId } =await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;
  const student = jwt.verify(token, SECRET);

  const [[existing]] = await db.query(
    `SELECT * FROM exam_attempts WHERE exam_id = ? AND student_id = ?`,
    [examId, student.id]
  );

  if (existing && existing.status === "submitted") {
    return Response.json(
      { message: "EXAM_ALREADY_SUBMITTED" },
      { status: 409 }
    );
  }

  if (!existing) {
    await db.query(
      `
      INSERT INTO exam_attempts (exam_id, student_id, status, start_time)
      VALUES (?, ?, 'in_progress', NOW())
      `,
      [examId, student.id]
    );
  }

  return Response.json({ success: true });
}

