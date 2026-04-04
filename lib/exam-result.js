import { db } from "@/lib/db";

function normalizeAnswer(value, questionType) {
  if (value == null || value === "") {
    return [];
  }

  if (questionType === "mcq") {
    const values = Array.isArray(value) ? value : [value];
    return values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item))
      .sort((a, b) => a - b);
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? [numericValue] : [];
}

function arraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function optionIdsToLetters(optionIds, optionOrderMap) {
  if (!optionIds.length) {
    return null;
  }

  return optionIds
    .map((optionId) => optionOrderMap.get(optionId))
    .filter(Boolean)
    .join(",");
}

export async function generateExamResult(attemptId) {
  const [[attempt]] = await db.query(
    `SELECT * FROM exam_attempts WHERE id = ?`,
    [attemptId]
  );

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  const answers = JSON.parse(attempt.answers_json || "{}");

  const [rows] = await db.query(
    `
    SELECT
      ep.negative_marking,
      esq.section_id,
      eps.section_name,
      eps.marks_per_question,
      eps.negative_marks AS section_negative_marks,
      q.id AS question_id,
      q.question_type,
      q.marks,
      q.negative_marks,
      qo.id AS option_id,
      qo.is_correct
    FROM exam_patterns ep
    JOIN exam_pattern_sections eps
      ON eps.exam_pattern_id = ep.id
    JOIN exam_section_questions esq
      ON esq.section_id = eps.id
    JOIN questions q
      ON q.id = esq.question_id
    LEFT JOIN question_options qo
      ON qo.question_id = q.id
    WHERE ep.exam_id = ?
    ORDER BY esq.section_id, eps.id, q.id, qo.id
    `,
    [attempt.exam_id]
  );

  const questionMap = new Map();

  for (const row of rows) {
    const key = `${row.section_id}-${row.question_id}`;

    if (!questionMap.has(key)) {
      questionMap.set(key, {
        key,
        sectionId: row.section_id,
        sectionName: row.section_name,
        questionId: row.question_id,
        questionType: row.question_type,
        marks: Number(row.marks_per_question ?? row.marks ?? 0),
        negativeMarks:
          Number(row.negative_marking ?? 0) === 1
            ? Number(row.section_negative_marks ?? row.negative_marks ?? 0)
            : 0,
        correctOptionIds: [],
        optionOrderMap: new Map(),
      });
    }

    const question = questionMap.get(key);

    if (row.option_id) {
      const optionId = Number(row.option_id);
      const nextOrder = question.optionOrderMap.size;
      question.optionOrderMap.set(
        optionId,
        String.fromCharCode(65 + nextOrder)
      );

      if (Number(row.is_correct) === 1) {
        question.correctOptionIds.push(optionId);
      }
    }
  }

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let obtained = 0;
  let totalMarks = 0;

  const answerRows = [];

  for (const question of questionMap.values()) {
    totalMarks += question.marks;

    const selectedOptionIds = normalizeAnswer(
      answers[question.key],
      question.questionType
    );
    const correctOptionIds = [...question.correctOptionIds].sort((a, b) => a - b);
    const isSkipped = selectedOptionIds.length === 0;
    const isCorrect = !isSkipped && arraysEqual(selectedOptionIds, correctOptionIds);
    const awardedMarks = isSkipped
      ? 0
      : isCorrect
        ? question.marks
        : -question.negativeMarks;

    if (isSkipped) {
      skipped++;
    } else if (isCorrect) {
      correct++;
    } else {
      wrong++;
    }

    obtained += awardedMarks;

    answerRows.push({
      examId: attempt.exam_id,
      studentId: attempt.student_id,
      sectionId: question.sectionId,
      questionId: question.questionId,
      selectedOptionIds,
      correctOptionIds,
      isCorrect,
      marksAwarded: awardedMarks,
      rightMarks: question.marks,
      negativeMarks: question.negativeMarks,
      selectedOption: optionIdsToLetters(selectedOptionIds, question.optionOrderMap),
      correctOption: optionIdsToLetters(correctOptionIds, question.optionOrderMap),
    });
  }

  const totalQuestions = answerRows.length;
  const answered = correct + wrong;
  const percentage = totalMarks > 0 ? Number(((obtained / totalMarks) * 100).toFixed(2)) : 0;
  const status = percentage >= 33 ? "pass" : "fail";

  const [resultWrite] = await db.query(
    `
    INSERT INTO exam_results
    (exam_id, student_id, attempt_id,
     total_questions, answered, correct, wrong, skipped,
     total_marks, obtained_marks, percentage, result_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_questions = VALUES(total_questions),
      answered = VALUES(answered),
      correct = VALUES(correct),
      wrong = VALUES(wrong),
      skipped = VALUES(skipped),
      total_marks = VALUES(total_marks),
      obtained_marks = VALUES(obtained_marks),
      percentage = VALUES(percentage),
      result_status = VALUES(result_status)
    `,
    [
      attempt.exam_id,
      attempt.student_id,
      attempt.id,
      totalQuestions,
      answered,
      correct,
      wrong,
      skipped,
      totalMarks,
      obtained,
      percentage,
      status,
    ]
  );

  let resultId = resultWrite.insertId;

  if (!resultId) {
    const [[existingResult]] = await db.query(
      `SELECT id FROM exam_results WHERE attempt_id = ? LIMIT 1`,
      [attempt.id]
    );
    resultId = existingResult?.id;
  }

  if (!resultId) {
    throw new Error("Unable to persist exam result");
  }

  await db.query(`DELETE FROM exam_answers WHERE exam_result_id = ?`, [resultId]);

  for (const row of answerRows) {
    await db.query(
      `
      INSERT INTO exam_answers
      (
        exam_result_id,
        exam_id,
        student_id,
        section_id,
        question_id,
        selected_option,
        selected_option_id,
        selected_option_ids_json,
        correct_option,
        is_correct,
        right_marks,
        negative_marks,
        marks_awarded
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        resultId,
        row.examId,
        row.studentId,
        row.sectionId,
        row.questionId,
        row.selectedOption,
        row.selectedOptionIds[0] ?? null,
        row.selectedOptionIds.length ? JSON.stringify(row.selectedOptionIds) : null,
        row.correctOption || "",
        row.isCorrect ? 1 : 0,
        row.rightMarks,
        row.negativeMarks,
        row.marksAwarded,
      ]
    );
  }

  return {
    resultId,
    totalQuestions,
    answered,
    correct,
    wrong,
    skipped,
    obtained,
    totalMarks,
    percentage,
    status,
  };
}
