import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = "student-secret-key";

export async function GET(req, { params }) {
  const { id: examId } =await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    jwt.verify(token, SECRET);
  } catch {
    return Response.json({ message: "Invalid token" }, { status: 401 });
  }

  const [[exam]] = await db.query(
    `
    SELECT
      id,
      title,
      duration_minutes,
      total_questions,
      total_marks
      
    FROM exams
    WHERE id = ?
      AND status = 'published'
    `,
    [examId]
  );

  if (!exam) {
    return Response.json({ message: "Exam not found" }, { status: 404 });
  }

  return Response.json({ exam });
}
