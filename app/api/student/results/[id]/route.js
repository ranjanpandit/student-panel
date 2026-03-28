import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = "student-secret-key";

export async function GET(req, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token)
    return Response.json({ message: "Unauthorized" }, { status: 401 });

  const student = jwt.verify(token, SECRET);
  const { id } = await params;

  const [rows] = await db.query(
    `
    SELECT 
      er.*,
      e.title AS exam_title
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    WHERE er.id = ? AND er.student_id = ?
    `,
    [id, student.id],
  );

  return Response.json(rows[0] || null);
}
