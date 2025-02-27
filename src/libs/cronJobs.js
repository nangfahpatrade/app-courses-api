// import corm from 'node-cron'
// import jwt from 'jsonwebtoken'
// import pool from "../db/index.js";

// const jwtSecret = process.env.JWT_SECRET;

// // ตั้งค่า cron job ให้รันทุกวันเวลาเที่ยงคืน
// cron.schedule('0 0 * * *', async () => {
//     console.log('กำลังตรวจสอบการหมดอายุของ token');
//     const db = await pool.connect();
//     try {
//       const sql = `SELECT id, token FROM users WHERE status_login = 1`;
//       const result = await db.query(sql);
  
//       result.rows.forEach(async (user) => {
//         try {
//           jwt.verify(user.token, jwtSecret);
//         } catch (error) {
//           if (error.name === 'TokenExpiredError') {
//             const sqlUpdateStatus = `UPDATE users SET status_login = 0 WHERE id = $1`;
//             await db.query(sqlUpdateStatus, [user.id]);
//             console.log(`อัปเดตสถานะผู้ใช้ ID: ${user.id} เนื่องจาก token หมดอายุ`);
//           }
//         }
//       });
//     } catch (error) {
//       console.error("Error while checking token expiry:", error);
//     } finally {
//       db.release();
//     }
//   });