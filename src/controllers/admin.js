import pool from "../db/index.js";
import bcrypt from 'bcrypt'

export const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();

  try {
    if (!id) return res.status(400).json({ message: "ไม่พบ id ที่จะลบ" });

    const sql = `DELETE FROM users WHERE id = $1`;
    await db.query(sql, [id]);
    return res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getAllAdmin = async (req, res) => {
  const { status, search } = req.body;
  const db = await pool.connect();
  console.log(req.body);
  try {
    // แบ่งหน้า 1/2
    const page = parseInt(req.body.page) || 1;
    const limit = 4;
    const offset = (page - 1) * limit;

    // แบ่งหน้า 2/2
    const countSql = "SELECT COUNT(id) FROM users WHERE status = $1";
    const countResult = await db.query(countSql, [status]);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const params = [status, limit, offset];
    let sql = `SELECT id, username, name FROM users WHERE status = $1  `;

    if (search) {
      sql += ` AND name LIKE $4`;
      params.push(`%${search}%`);
    }
    sql += ` LIMIT $2 OFFSET $3`;

    console.log(sql);
    const result = await db.query(sql, params);

    return res.status(200).json({
      page,
      limit,
      totalPages,
      totalItems,
      data: result.rows,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};



export const getAdminById = async (req, res) => {
  const db = await pool.connect();
  const id = parseInt(req.body.id);
  try {
    if (isNaN(id)) return res.status(400).json({ message: "ไม่พบ id, status" });
    const sql = `SELECT id, username, password FROM users WHERE id = $1 `;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const editAdminById = async (req, res) => {
  const { id, username, password, name } = req.body;
  const db = await pool.connect();

  try {
   // ตรวจสอบว่ามีผู้ใช้ที่มี id นี้หรือไม่
    const sqlCheck = `SELECT id, username , password FROM users WHERE id = $1`;
    const resultCheck = await db.query(sqlCheck, [id]);
    console.log(resultCheck.rows[0]);

    if(resultCheck.rows.length === 0) return res.status(400).json({message : 'ไม่พบผู้ใช้งาน'})
    const user = resultCheck.rows[0]

    // ตรวจสอบว่า username ใหม่ไม่ซ้ำกับคนอื่น ยกเว้นตัวเอง
    const sqlUsernameCheck  = `SELECT id FROM users WHERE username = $1 AND id != $2`
    const resultUsernameCheck  = await db.query(sqlUsernameCheck, [username, id])

    if(resultUsernameCheck.rows.length > 0) {
      return res.status(400).json({message: 'มี Username นี้ในระบบแล้ว'})
    }

    // ตรวจสอบว่ารหัสผ่านถูกเปลี่ยนหรือไม่
    let hashedPassword = user.password;
    if (user.password !== password) {
      hashedPassword = await bcrypt.hash(password, 10);
      // console.log('รหัสผ่านถูกเปลี่ยน');
    } 

    // อัพเดทข้อมูลผู้ใช้
    const sql = `UPDATE users SET username = $1, password = $2, name = $3 WHERE id = $4 `
    await db.query(sql, [username, hashedPassword, name, id])
    return res.status(200).json({message : 'ทำรายการสำเร็จ'})


  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};



