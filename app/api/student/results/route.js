import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = "student-secret-key";

export async function GET() {
  /* ---------------- AUTH ---------------- */
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  let student;
  try {
    student = jwt.verify(token, SECRET);
  } catch {
    return Response.json({ message: "Invalid token" }, { status: 401 });
  }

  const student_id = student.id;

  try {
    /* -------- FETCH STUDENT RESULTS -------- */
    const [results] = await db.query(
      `
      SELECT 
        er.id,
        er.exam_id,
        er.total_questions,
        er.correct,
        er.wrong,
        er.total_marks,
        er.obtained_marks,
        er.percentage,
        er.result_status,
        er.created_at,
        e.title AS exam_title
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      WHERE er.student_id = ?
      ORDER BY er.created_at DESC
      `,
      [student_id]
    );

    return Response.json(results);
  } catch (error) {
    console.error("STUDENT_RESULT_FETCH_ERROR:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}