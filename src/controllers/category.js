import pool from "../db/index.js";

export const getAllCategory = async (req, res) => {
  const { search , full} = req.body;

  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM category`;
    const resultPage = await db.query(sqlPage);

    const limit = full ? resultPage.rows[0].count : 10;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    

    let sql = `SELECT id, name FROM category`;
    const params = [limit, offset];
    if (search) {
      sql += ` WHERE name LIKE $3`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY id DESC LIMIT $1 OFFSET $2 `;

    const result = await db.query(sql, params);
    console.log({result:result.rows});
    console.log({page});
    
    
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

export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT id, name FROM category WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const addNewCategory = async (req, res) => {
  const { name } = req.body;
  const db = await pool.connect();
  try {
    if (!name) return res.status(400).json({ message: "ส่งข้อมูลมาไม่ครบ" });

    // เช็คข้อมูลซ้ำ
    const sqlCheckName = `SELECT id FROM category WHERE name = $1`;
    const resultCheckName = await db.query(sqlCheckName, [name]);
    if (resultCheckName.rows.length > 0)
      return res.status(400).json({ message: "มีหมวดหมู่นี้แล้ว" });

    // บันทึกข้อมูล
    const sql = `INSERT INTO category (name) VALUES ($1)`;
    await db.query(sql, [name]);
    return res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `DELETE FROM category WHERE id = $1`;
    await db.query(sql, [id]);
    return res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const editCategory = async (req, res) => {
  const { id, name } = req.body;
  const db = await pool.connect()
  console.log(req.body);
  try {
    if (!id || !name)
    return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // เช็คชื่อ ซ้ำกับคนอื่นในระบบไหม ยกเว้นตัวเอง
    const sqlCheck = `SELECT id FROM category WHERE name = $1 AND id != $2`
    const resultCheck = await db.query(sqlCheck, [name, id])
    if(resultCheck.rows.length > 0) return res.status(400).json({message : 'มีหมวดหมู่นี้แล้ว'})

    // บันทึก
    const sql = `UPDATE category SET name = $1 WHERE id = $2`
    await db.query(sql, [name, id])
    return res.status(200).json({message : 'บันทึกสำเร็จ'})
  

  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release()
  }
};
