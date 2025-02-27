import pool from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { checkLoginToken } from "../libs/checkLoginToken.js";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);
  
  const db = await pool.connect();
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "ส่งข้อมูลมาไม่ครบ" });
    }
    // เช็คความถูกต้อง
    const sql = `SELECT id, username, password, status FROM users WHERE username = $1`;
    const result = await db.query(sql, [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "ชื่อผู้ใช้งานไม่ถูกต้อง" });
    }
    // เช็ค password ตรงกันไหม
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(passwordMatch);

    if (!passwordMatch) {
      return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    // ต้องการเช็คว่า ถ้า token หมดอายุแล้ว ให้ Update Status เป็น 0 
    const checkStatus =  await checkLoginToken(user.id)
    console.log({checkStatus});
    
    
    // เช็ค Status Login มีคนใช้งานอยู่
    const sqlCheckStatusLogin = `SELECT id FROM users  WHERE status_login = 1 AND id = $1 `
    const resultCheckStatusLogin = await db.query(sqlCheckStatusLogin, [user.id])
    if(resultCheckStatusLogin.rows.length > 0) return res.status(400).json({message : 'มีผู้ใช้งานเข้าสู่ระบบอยู่แล้ว'})

    // OK
    const token = jwt.sign(
      { id: user.id, username: user.username, status: user.status },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Update Status Login
    const sqlUpdateStatusLogin = `UPDATE users SET status_login = $1, token = $2 WHERE id = $3`
    await db.query(sqlUpdateStatusLogin, [1, token, user.id ])

    return res.status(200).json({ message: "เข้าสู่ระบบสำเร็จ", token });


  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const loginUserOtp = async (req, res) => {
  const { id, otp } = req.body;
  const db = await pool.connect();
  try {
    if (!id || !otp) return res.status(400).json({ message: "ไม่พบข้อมูล" });

    // check otp
    const sqlCheck = `SELECT id, username, status FROM users WHERE id = $1 AND otp = $2`;
    const resultCheck = await db.query(sqlCheck, [id, otp]);
    if (resultCheck.rows.length <= 0)
      return res.status(400).json({ message: "Token ไม่ตรงกัน" });

    const user = resultCheck.rows[0];

    // OK
    const token = jwt.sign(
      { id: user.id, username: user.username, status: user.status },
      jwtSecret,
      { expiresIn: "1d" }
    );
    return res.status(200).json({ message: "เข้าสู่ระบบสำเร็จ", token });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getMyUserData = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();

  try {
    const sql = `SELECT id, username, name, email, phone, trade, address FROM users WHERE id = $1 `;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const putMyUserData = async (req, res) => {
  const db = await pool.connect();
  const { id, username, password, name, email, phone, trade, address } =
    req.body;
  console.log("222222");

  try {
    if (!id) return res.status(400).json({ message: "ไม่พบผู้ใช้งาน" });

    // check ซ้ำ
    const sqlCheck = `SELECT id FROM users WHERE id != $1 AND (username = $2 OR email = $3 OR phone = $4) `;
    const resultCheck = await db.query(sqlCheck, [id, username, email, phone]);

    if (resultCheck.rowCount > 0)
      return res.status(400).json({ message: "มีผู้ใช้นี้แล้ว กรุณาลองใหม่" });

    // check password
    const sqlCheckPassword = `SELECT password FROM users WHERE id = $1`;
    const resultCheckPassword = await db.query(sqlCheckPassword, [id]);

    let newPassword = resultCheckPassword.rows[0].password;

    if (password !== "") {
      const hashedPassword = await bcrypt.hash(password, 10); // เข้ารหัสรหัสผ่าน
      newPassword = hashedPassword;
    }

    // บันทึก
    const sql = `UPDATE users SET username = $1, password = $2 , name = $3, email = $4, phone = $5, trade = $6, address = $7 WHERE id = $8 `
    await db.query(sql, [
      username,
      newPassword,
      name,
      email,
      phone,
      trade,
      address,
      id
    ])
    return res.status(200).json({message : 'บันทึกสำเร็จ', statusPassword :password === "" ? 0 : 1 })

    
    
    console.log("กระบวนการต่อไป");
  } catch (error) {
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};
