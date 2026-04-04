import jwt from "jsonwebtoken";

const STUDENT_JWT_SECRET =
  process.env.STUDENT_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "student-secret-key";

export function getStudentJwtSecret() {
  return STUDENT_JWT_SECRET;
}

export function verifyStudentToken(token) {
  return jwt.verify(token, STUDENT_JWT_SECRET);
}

export function signStudentToken(payload, options = {}) {
  return jwt.sign(payload, STUDENT_JWT_SECRET, options);
}
