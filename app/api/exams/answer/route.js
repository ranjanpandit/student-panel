import { db } from "@/lib/db";

export async function POST(req) {
  const { attemptId, questionId, answer } = await req.json();

  await db.query(
    `
    INSERT INTO exam_answers (attempt_id, question_id, answer)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE answer = VALUES(answer)
    `,
    [attemptId, questionId, answer]
  );

  return Response.json({ success: true });
}
