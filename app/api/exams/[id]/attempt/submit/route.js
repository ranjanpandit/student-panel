import { db } from "@/lib/db";
import { generateExamResult } from "@/lib/exam-result";
import { verifyStudentToken } from "@/lib/student-auth";

function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(name + "="))
    ?.split("=")[1];
}

export async function POST(req, { params }) {
  try {
    const { id: examId } = await params;
    const { reason, tabViolations = 0, fsViolations = 0, questionTimes } = await req.json();

    const token = getCookie(req, "student_token");
    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = verifyStudentToken(token);

    const [[attempt]] = await db.query(
      `
      SELECT a.id, a.violations, COALESCE(ep.show_result_after_submit, 0) AS show_result_after_submit
      FROM exam_attempts a
      LEFT JOIN exam_patterns ep ON ep.exam_id = a.exam_id
      WHERE a.exam_id = ?
        AND a.student_id = ?
        AND a.status = 'in_progress'
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

    let normalizedQuestionTimes = null;
    if (questionTimes && typeof questionTimes === "object" && !Array.isArray(questionTimes)) {
      normalizedQuestionTimes = Object.fromEntries(
        Object.entries(questionTimes)
          .map(([k, v]) => [k, Number(v)])
          .filter(([k, v]) => typeof k === "string" && Number.isFinite(v) && v >= 0)
          .map(([k, v]) => [k, Math.floor(v)])
      );
    }

    await db.query(
      `
      UPDATE exam_attempts
      SET
        status = 'submitted',
        exit_reason = ?,
        remaining_seconds = 0,
        question_time_json = COALESCE(?, question_time_json),
        end_time = NOW(),
        violations = ?,
        last_activity = NOW(),
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        reason || "MANUAL",
        normalizedQuestionTimes ? JSON.stringify(normalizedQuestionTimes) : null,
        Number(attempt.violations || 0) + Number(tabViolations || 0) + Number(fsViolations || 0),
        attempt.id,
      ]
    );

    const result = await generateExamResult(attempt.id);
    const revealResult = Number(attempt.show_result_after_submit || 0) === 1;

    return Response.json({
      success: true,
      revealResult,
      result: revealResult ? result : null,
    });
  } catch (err) {
    console.error("SUBMIT_ERROR:", err);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
