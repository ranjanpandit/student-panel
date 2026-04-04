import { cookies } from "next/headers";
import { verifyStudentToken } from "@/lib/student-auth";

export async function getStudentFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token) {
    return null;
  }

  try {
    return verifyStudentToken(token);
  } catch {
    return null;
  }
}
