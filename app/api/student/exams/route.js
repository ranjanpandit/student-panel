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

  /* -------- STUDENT CLASS & BATCH -------- */
  const [[meta]] = await db.query(
    `
    SELECT 
      sc.class_id,
      sb.batch_id
    FROM students s
    LEFT JOIN student_classes sc ON sc.student_id = s.id
    LEFT JOIN student_batches sb ON sb.student_id = s.id
    WHERE s.id = ?
    `,
    [student_id]
  );
  console.log(student_id)
  const classId = meta?.class_id || null;
  const batchId = meta?.batch_id || null;

  /* ----------- ELIGIBLE EXAMS ------------ */
  const [rows] = await db.query(
    `
    SELECT DISTINCT
      e.id,
      e.title,
      e.duration_minutes,
      e.start_time,
      e.end_time,

      a.status       AS attempt_status,
      a.start_time   AS attempt_start

    FROM exams e

    /* attempt (resume / submitted) */
    LEFT JOIN exam_attempts a
      ON a.exam_id = e.id AND a.student_id = ?

    /* class eligibility */
    LEFT JOIN exam_classes ec
      ON ec.exam_id = e.id

    /* batch eligibility */
    LEFT JOIN exam_batches eb
      ON eb.exam_id = e.id

    /* explicit registration */
    LEFT JOIN exam_registrations er
      ON er.exam_id = e.id AND er.student_id = ?

    WHERE
      e.status = 'published'
      AND NOW() BETWEEN e.start_time AND e.end_time
      AND (
        ec.class_id = ?
        OR eb.batch_id = ?
        OR er.student_id IS NOT NULL
      )

    ORDER BY e.start_time ASC
    `,
    [student_id, student_id, classId, batchId]
  );

  return Response.json(rows);
}
