import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyStudentToken } from "@/lib/student-auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  let student;
  try {
    student = verifyStudentToken(token);
  } catch {
    return Response.json({ message: "Invalid token" }, { status: 401 });
  }

  const studentId = student.id;

  const [[meta]] = await db.query(
    `
    SELECT
      (
        SELECT sc.class_id
        FROM student_classes sc
        WHERE sc.student_id = s.id
        ORDER BY (sc.status = 'active') DESC, sc.id DESC
        LIMIT 1
      ) AS class_id,
      (
        SELECT sb.batch_id
        FROM student_batches sb
        WHERE sb.student_id = s.id
        ORDER BY (sb.status = 'active') DESC, sb.id DESC
        LIMIT 1
      ) AS batch_id
    FROM students s
    WHERE s.id = ?
    LIMIT 1
    `,
    [studentId]
  );

  const classId = meta?.class_id ?? null;
  const batchId = meta?.batch_id ?? null;

  const [rows] = await db.query(
    `
    SELECT
      e.id,
      e.title,
      e.duration_minutes,
      e.total_questions,
      e.exam_theme,
      e.start_time,
      e.end_time,
      a.status AS attempt_status,
      a.start_time AS attempt_start
    FROM exams e
    LEFT JOIN exam_attempts a
      ON a.exam_id = e.id AND a.student_id = ?
    WHERE
      e.status = 'published'
      AND NOW() BETWEEN COALESCE(e.start_time, NOW()) AND COALESCE(e.end_time, NOW())
      AND (
        EXISTS (
          SELECT 1
          FROM exam_classes ec
          WHERE ec.exam_id = e.id AND ec.class_id = ?
        )
        OR EXISTS (
          SELECT 1
          FROM exam_batches eb
          WHERE eb.exam_id = e.id AND eb.batch_id = ?
        )
        OR EXISTS (
          SELECT 1
          FROM exam_registrations er
          WHERE er.exam_id = e.id AND er.student_id = ?
        )
      )
    ORDER BY e.start_time ASC, e.id DESC
    `,
    [studentId, classId, batchId, studentId]
  );

  return Response.json(rows);
}
