import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyStudentToken } from "@/lib/student-auth";

export async function POST(req, { params }) {
  try {
    const { id: examId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("student_token")?.value;

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = verifyStudentToken(token);

    const [[exam]] = await db.query(
      `SELECT id, duration_minutes, status FROM exams WHERE id = ? LIMIT 1`,
      [examId]
    );

    if (!exam || exam.status !== "published") {
      return Response.json({ message: "Exam not available" }, { status: 404 });
    }

    const [[existing]] = await db.query(
      `SELECT * FROM exam_attempts WHERE exam_id = ? AND student_id = ? LIMIT 1`,
      [examId, student.id]
    );

    if (existing?.status === "submitted") {
      return Response.json(
        { message: "EXAM_ALREADY_SUBMITTED" },
        { status: 409 }
      );
    }

    if (!existing) {
      await db.query(
        `
        INSERT INTO exam_attempts
        (exam_id, student_id, status, start_time, remaining_seconds, last_activity)
        VALUES (?, ?, 'in_progress', NOW(), ?, NOW())
        `,
        [examId, Number(exam.duration_minutes || 0) * 60]
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("EXAM_START_ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
