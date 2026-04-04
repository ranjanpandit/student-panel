import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyStudentToken } from "@/lib/student-auth";

async function getAuthorizedStudent(examId) {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token) {
    return { error: Response.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  let student;
  try {
    student = verifyStudentToken(token);
  } catch {
    return { error: Response.json({ message: "Invalid token" }, { status: 401 }) };
  }

  const [[meta]] = await db.query(
    `
    SELECT
      s.id,
      CONCAT_WS(' ', s.first_name, s.last_name) AS student_name,
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
    [student.id]
  );

  const [[exam]] = await db.query(
    `
    SELECT
      e.id,
      e.title,
      e.duration_minutes,
      e.total_questions,
      e.total_marks,
      e.start_time,
      e.end_time,
      e.exam_theme,
      ep.instructions,
      ep.allow_section_switch,
      ep.allow_review,
      ep.shuffle_questions,
      ep.shuffle_options,
      EXISTS (
        SELECT 1
        FROM exam_classes ec
        WHERE ec.exam_id = e.id AND ec.class_id = ?
      ) AS class_allowed,
      EXISTS (
        SELECT 1
        FROM exam_batches eb
        WHERE eb.exam_id = e.id AND eb.batch_id = ?
      ) AS batch_allowed,
      EXISTS (
        SELECT 1
        FROM exam_registrations er
        WHERE er.exam_id = e.id AND er.student_id = ?
      ) AS registered_allowed
    FROM exams e
    LEFT JOIN exam_patterns ep ON ep.exam_id = e.id
    WHERE e.id = ? AND e.status = 'published'
    LIMIT 1
    `,
    [meta?.class_id ?? null, meta?.batch_id ?? null, student.id, examId]
  );

  if (!exam) {
    return { error: Response.json({ message: "Exam not found" }, { status: 404 }) };
  }

  const now = new Date();
  if (exam.start_time && now < new Date(exam.start_time)) {
    return { error: Response.json({ message: "Exam has not started yet" }, { status: 403 }) };
  }

  if (exam.end_time && now > new Date(exam.end_time)) {
    return { error: Response.json({ message: "Exam window is closed" }, { status: 403 }) };
  }

  if (!(exam.class_allowed || exam.batch_allowed || exam.registered_allowed)) {
    return { error: Response.json({ message: "Exam is not assigned to this student" }, { status: 403 }) };
  }

  return {
    student: {
      id: student.id,
      name: meta?.student_name?.trim() || "Student",
    },
    exam,
  };
}

export async function GET(req, { params }) {
  const { id: examId } = await params;
  const auth = await getAuthorizedStudent(examId);

  if (auth.error) {
    return auth.error;
  }

  const { exam } = auth;

  return Response.json({
    exam: {
      id: exam.id,
      title: exam.title,
      duration_minutes: exam.duration_minutes,
      total_questions: exam.total_questions,
      total_marks: exam.total_marks,
      instructions: exam.instructions || "",
      start_time: exam.start_time,
      end_time: exam.end_time,
      exam_theme: exam.exam_theme || "standard",
      allow_section_switch: Number(exam.allow_section_switch ?? 1),
      allow_review: Number(exam.allow_review ?? 1),
    },
  });
}
