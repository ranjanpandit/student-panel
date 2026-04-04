import { db } from "@/lib/db";
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

function normalizeIncomingAnswer(answer, questionType) {
  const normalizedType = String(questionType || "").toLowerCase();
  const isMulti =
    normalizedType === "mcq" ||
    normalizedType === "msq" ||
    normalizedType === "multiple" ||
    normalizedType === "multiple_choice";

  if (isMulti) {
    const values = Array.isArray(answer) ? answer : answer == null ? [] : [answer];
    return values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  }

  const numericValue = Number(answer);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function hasMeaningfulAnswer(answer, questionType) {
  const normalizedType = String(questionType || "").toLowerCase();
  const isMulti =
    normalizedType === "mcq" ||
    normalizedType === "msq" ||
    normalizedType === "multiple" ||
    normalizedType === "multiple_choice";

  if (isMulti) {
    return Array.isArray(answer) && answer.length > 0;
  }

  return answer != null;
}

export async function POST(req, { params }) {
  try {
    const { id: examId } = await params;
    const { sectionId, questionId, answer, timeLeft, questionTimes } = await req.json();

    const token = getCookie(req, "student_token");
    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const student = verifyStudentToken(token);

    const [[attempt]] = await db.query(
      `
      SELECT id, answers_json, question_time_json
      FROM exam_attempts
      WHERE exam_id = ?
        AND student_id = ?
        AND status = 'in_progress'
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

    const [[questionMeta]] = await db.query(
      `
      SELECT q.question_type
      FROM exam_section_questions esq
      JOIN questions q ON q.id = esq.question_id
      WHERE esq.section_id = ? AND esq.question_id = ?
      LIMIT 1
      `,
      [sectionId, questionId]
    );

    if (!questionMeta) {
      return Response.json(
        { message: "Question not found in this section" },
        { status: 404 }
      );
    }

    let answers = {};
    if (attempt.answers_json) {
      try {
        answers = JSON.parse(attempt.answers_json);
      } catch {
        answers = {};
      }
    }

    const key = `${sectionId}-${questionId}`;
    const normalizedAnswer = normalizeIncomingAnswer(
      answer,
      questionMeta.question_type
    );

    if (hasMeaningfulAnswer(normalizedAnswer, questionMeta.question_type)) {
      answers[key] = normalizedAnswer;
    } else {
      delete answers[key];
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
        answers_json = ?,
        question_time_json = COALESCE(?, question_time_json),
        current_section_id = ?,
        remaining_seconds = COALESCE(?, remaining_seconds),
        last_activity = NOW(),
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        JSON.stringify(answers),
        normalizedQuestionTimes ? JSON.stringify(normalizedQuestionTimes) : null,
        sectionId,
        Number.isFinite(Number(timeLeft)) ? Number(timeLeft) : null,
        attempt.id,
      ]
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("SAVE_ANSWER_ERROR:", err);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
