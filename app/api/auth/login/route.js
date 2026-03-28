import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = "student-secret-key"; // move to env later

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { message: "Email & password required" },
      { status: 400 }
    );
  }
  
  const [[student]] = await db.query(
    `SELECT * FROM students WHERE email=? LIMIT 1`,
    [email]
  );
  if (!student) {
    return Response.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const match = await bcrypt.compare(password, student.password);

  if (!match) {
    return Response.json(
      { message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = jwt.sign(
    { id: student.id, role: "student" },
    SECRET,
    { expiresIn: "7d" }
  );

  return Response.json({
    success: true,
    token,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
    },
  });
}
