import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = "student-secret-key"; // move to env later

export function getStudentFromCookie() {
  const token = cookies().get("student_token")?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
