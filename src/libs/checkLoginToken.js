import corm from "node-cron";
import jwt from "jsonwebtoken";
import pool from "../db/index.js";



const jwtSecret = process.env.JWT_SECRET;
export const checkLoginToken = async (id) => {
  const db = await pool.connect();
  try {
    if (!id) return false;

    const sql = `SELECT id, token FROM users WHERE status_login = 1`;
    const result = await db.query(sql);

    if (result.rows.length === 0) return false;
    const user = result.rows[0];

    // ตรวจสอบ token ว่ายังใช้ได้อยู่หรือไม่
    try {
      console.log('11111111111111111');
      
      jwt.verify(user.token, jwtSecret);
      return true; // token ยังใช้ได้
    } catch (error) {
    //   if (error.name === "TokenExpiredError") {

    //     console.error(`Token for user ID: ${user.id} has expired.`);
    //     const sqlUpdateStatus = `UPDATE users SET status_login = 0 WHERE id = $1`;
    //     await db.query(sqlUpdateStatus, [user.id]);
    //     console.log('111111');
    //     return false; // token หมดอายุแล้ว

    //   } else {

    //     console.error("Invalid token:", error);
    //     console.log('222222');
    //     return false; // token ไม่ถูกต้อง

    //   }

    console.log('222222222222222');
      console.error(`Token for user ID: ${user.id} has expired.`);
      const sqlUpdateStatus = `UPDATE users SET status_login = 0 WHERE id = $1`;
      await db.query(sqlUpdateStatus, [user.id]);
      return false; // token หมดอายุแล้ว และ ไม่ถูกต้อง


    }
  } catch (error) {
    console.error("Error while checking token expiry:", error);
  } finally {
    db.release();
  }
};
