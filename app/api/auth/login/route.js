import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signStudentToken } from "@/lib/student-auth";

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { message: "Email & password required" },
      { status: 400 }
    );
  }

  const [[student]] = await db.query(
    `SELECT * FROM students WHERE email = ? LIMIT 1`,
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

  const token = signStudentToken(
    { id: student.id, role: "student" },
    { expiresIn: "7d" }
  );

  return Response.json({
    success: true,
    token,
    student: {
      id: student.id,
      name: [student.first_name, student.last_name].filter(Boolean).join(" ").trim(),
      email: student.email,
    },
  });
}
