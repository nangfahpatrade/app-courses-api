import pool from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const logout = async (req, res) => {
  const { id } = req.body;
  const db = await pool.connect();
  // req.body { '{"id":"24"}': '' }
  console.log({logout : req.body });
  
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    const sqlUpdate = `UPDATE users SET status_login = 0, token = $1 WHERE id = $2 `;
    await db.query(sqlUpdate, ["", id]);

    const sql = `SELECT id, status_login FROM users WHERE id = $1`
    const result = await db.query(sql, [id])
    console.log(result.rows[0])
    let status_login = 0
    if(result.rows.length > 0){
        status_login = result.rows[0].status_login
    }
    

    return res.status(200).json({ message: "ออกจากระบบสำเร็จ", status_login : status_login });

  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};


export const getAllUserLogin = async(req,res)=> {
    try {

        const { search, full } = req.body || "";
        const db = await pool.connect();
        try {
          // paginations
          const page = parseInt(req.body.page) || 1;
          const sqlPage = `SELECT COUNT(id) FROM users `;
          const resultPage = await db.query(sqlPage);
          const limit = full ? resultPage.rows[0].count : 9;
          const offset = (page - 1) * limit;
          const totalItems = parseInt(resultPage.rows[0].count);
          const totalPages = Math.ceil(totalItems / limit);
      
          let sql = `SELECT id, name, username, email, phone , status_login  FROM users WHERE status != 1 AND status != 2 `;
          const params = [limit, offset];
      
          if (search) {
            sql += ` AND email LIKE $3 OR phone LIKE $4`;
            params.push(`%${search}%`, `%${search}%`);
          }
      
          sql += ` LIMIT $1 OFFSET $2`;
      
          const result = await db.query(sql, params);
          return res.status(200).json({
            page,
            limit,
            totalPages,
            totalItems,
            data: result.rows,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json(error.message);
        } finally {
          db.release();
        }
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.message)
        
    }
}
