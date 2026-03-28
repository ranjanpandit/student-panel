import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = "student-secret-key";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;

  if (!token) return Response.json({ message: "Unauthorized" }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch {
    return Response.json({ message: "Invalid token" }, { status: 401 });
  }

  try {
    // 1. Fetch Basic Profile
    const [profile] = await db.query(`SELECT * FROM students WHERE id = ?`, [decoded.id]);

    // 2. Fetch Academic Info (Classes & Batches)
    const [classes] = await db.query(
      `SELECT sc.*, c.name as class_name 
       FROM student_classes sc 
       LEFT JOIN classes c ON sc.class_id = c.id 
       WHERE sc.student_id = ?`, [decoded.id]
    );

    const [batches] = await db.query(
      `SELECT sb.*, b.name as batch_name 
       FROM student_batches sb 
       LEFT JOIN batches b ON sb.batch_id = b.id 
       WHERE sb.student_id = ?`, [decoded.id]
    );

    // 3. Fetch Financial Info (Fees & Payments)
    const [fees] = await db.query(`SELECT * FROM student_fees WHERE student_id = ?`, [decoded.id]);
    const [payments] = await db.query(`SELECT * FROM student_fee_payments WHERE student_id = ? ORDER BY paid_on DESC`, [decoded.id]);

    return Response.json({
      personal: profile[0],
      academic: { classes, batches },
      financial: { fees, payments }
    });
  } catch (error) {
    console.error("DATA_AGGREGATION_ERROR:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}