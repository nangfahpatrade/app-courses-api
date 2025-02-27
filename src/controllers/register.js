import pool from "../db/index.js";
import bcrypt from "bcrypt";

export const registerUser = async (req, res) => {
  const { username, password, name, status, email, phone } = req.body;
  const db = await pool.connect();
  try {
    if (
      !username ||
      !password ||
      typeof status === "undefined" ||
      !name ||
      !email ||
      !phone
    ) {
      // ทำไมส่งข้อมูลมา status : 0 เข้าเงื่อนไขนี้
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
    const sqlCheck = `SELECT id FROM users WHERE username = $1 OR phone = $2 OR email = $3`;
    const resultCheck = await db.query(sqlCheck, [username, phone, email]);
    if (resultCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "มีผู้ใช้งานนี้แล้ว กรุณาสมัครใหม่" });
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // เพิ่ม ฐานข้อมูล
    const sql = `INSERT INTO users (username , password, name, status, email, phone) VALUES ($1,$2,$3,$4, $5, $6) RETURNING *`;
    await db.query(sql, [username, hashedPassword, name, status, email, phone]);
    return res.status(200).json({ message: "สมัครสมาชิกสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const registerForgetPassword = async (req, res) => {
  const { id, otp, password } = req.body;
  const db = await pool.connect();
  try {
    if (!id || !otp || !password)
      return res.status(400).json({ message: "ไม่พบข้อมูล" });

    // check
    const sqlCheck = `SELECT id FROM users WHERE id = $1 AND otp = $2`;
    const resultCheck = await db.query(sqlCheck, [id, otp]);
    if (resultCheck.rows.length < 0)
      return res.status(400).json({ message: "ไม่พบ OTP ที่ตรงกัน" });

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // บันนทึก
    const sql = `UPDATE users SET password = $1 WHERE id = $2`;
    await db.query(sql, [hashedPassword, id]);
    return res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });


  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};
