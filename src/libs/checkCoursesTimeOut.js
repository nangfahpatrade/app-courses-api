import pool from "../db/index.js";

export const checkCoursesTimeOut = async (req, res, next) => {
  const db = await pool.connect();

  const users_id = req.user.id;

  try {
    // เช็คว่าคอร์สเรียนไหนหมดอายุแล้ว
    const sqlCheck = `SELECT  id FROM pay WHERE users_id = $1 AND end_pay::date < CURRENT_DATE   `;
    const expiredCourses = await db.query(sqlCheck, [users_id]);

    //ให้ update status เป็น 0 ทันที ถ้าหมดอายุ
    if (expiredCourses.rows.length > 0) {
      console.log("พบคอร์ส หมดอายุ");
      const sqlUpdate = `UPDATE pay SET status = 2 WHERE id = $1`;

      for (const course of expiredCourses.rows) {
        await db.query(sqlUpdate, [course.id]);
      }
    } else {
      console.log("ยังไม่พบคอร์สหมดอายุ");
    }

    // ดำเนินการ middleware ตัวต่อไป
    await next();
  } catch (error) {
    console.log(error);
  } finally {
    db.release();
  }
};
