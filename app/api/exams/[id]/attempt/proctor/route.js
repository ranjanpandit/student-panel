import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const SECRET = process.env.JWT_SECRET;

/* =========================
   SAFE COOKIE READER
========================= */
function getCookie(req, name) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  return cookieHeader
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(name + "="))
    ?.split("=")[1];
}

export async function POST(req, { params }) {
  try {
    const { id: examId } =await params;

    /* =========================
       AUTH
    ========================== */
    const token = getCookie(req, "student_token");
    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    let student;
    try {
      student = jwt.verify(token, SECRET);
    } catch {
      return Response.json({ message: "Invalid token" }, { status: 401 });
    }

    /* =========================
       PARSE FORM DATA
    ========================== */
    const formData = await req.formData();
    const image = formData.get("image");
    const event = formData.get("event") || "UNKNOWN";

    if (!image) {
      return Response.json(
        { message: "Image is required" },
        { status: 400 }
      );
    }

    /* =========================
       FIND ACTIVE ATTEMPT
    ========================== */
    const [[attempt]] = await db.query(
      `
      SELECT id
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
        { message: "No active attempt found" },
        { status: 400 }
      );
    }

    /* =========================
       STORE IMAGE (LOCAL)
       (Can move to S3/GCS later)
    ========================== */
    const buffer = Buffer.from(await image.arrayBuffer());

    const uploadDir = path.join(
      process.cwd(),
      "public/uploads/proctor"
    );

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `exam_${examId}_student_${student.id}_${event}_${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);

    /* =========================
       UPDATE ATTEMPT
       (Store last snapshot reference)
    ========================== */
    await db.query(
      `
      UPDATE exam_attempts
      SET
        proctor_image = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [filename, attempt.id]
    );

    return Response.json({
      success: true,
      event,
      file: `/uploads/proctor/${filename}`,
    });

  } catch (err) {
    console.error("PROCTOR SNAPSHOT ERROR:", err);
    return Response.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}
