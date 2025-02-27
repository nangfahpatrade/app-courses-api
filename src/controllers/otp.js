import pool from "../db/index.js";
import { sendNewMail } from "../libs/setOtp.js";
import dotenv from "dotenv";
dotenv.config();

// send.js
export const AddNewOtp = async (req, res) => {
  const { phone } = req.body;
  const db = await pool.connect();

  // สร้าง OTP แบบสุ่ม 6 หลัก
  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log(phone);

  try {
    // เช็ค phone
    const sqlCheck = `SELECT id, email FROM users WHERE phone = $1`;
    const resultCheck = await db.query(sqlCheck, [phone]);

    console.log(resultCheck.rows.length);
    
    if (resultCheck.rows.length <= 0)
      return res.status(400).json({ message: "ไม่พบ Email" });


    const id = resultCheck.rows[0].id || "";
    const userEmail = resultCheck.rows[0].email || "";

    const returnOtp = await sendNewMail(userEmail, otp);
    if (returnOtp !== "OK")
      return res.status(400).json({ message: "ส่ง OTP ไม่สำเร็จ" });
    console.log(otp);
    
    // บันทึก
    const sql = `UPDATE users SET otp = $1 WHERE id = $2 `;
    await db.query(sql, [otp, id]);
    return res.status(200).json({ message: "ส่ง otp สำเร็จ" });

    
  } catch (err) {
    console.error(err.message);
    return res.status(500).json(err.message)

  } finally {
    db.release();
  }
};

export const checkOtp = async (req, res) => {
  const { phone, otp } = req.body;
  const db = await pool.connect();
  try {
    // check
    const sqlCheck = `SELECT id, otp FROM users WHERE phone = $1`;
    const resultCheck = await db.query(sqlCheck, [phone]);
    if (resultCheck.rows.length < 0)
      return res.status(400).json({ message: "ไม่พบเบอร์โทรนี้ในระบบ" });

    const myOtp = resultCheck.rows[0].otp;
    const myId = resultCheck.rows[0].id
    if (myOtp !== otp)
      return res.status(400).json({ message: "OTP ไม่ตรงกัน" });

    return res.status(200).json(myId);

  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getOtp = async (req, res) => {
  try {
    res.json({ message: "555555555555" });
  } catch (error) {
    console.log(error);
  }
};
