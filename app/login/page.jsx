import { redirect } from "next/navigation";
import { getStudentFromCookie } from "@/lib/auth.server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const student = await getStudentFromCookie();

  if (student) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
