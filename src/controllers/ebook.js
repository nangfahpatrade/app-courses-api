import pool from "../db/index.js";
import multer from "multer";
import { uploadImageFile } from "../libs/uploadFile.js";
import { deleteImageFtp } from "../libs/ftpClient.js";
import { deleteImageFromAws, uploadImagesAws } from "../libs/awsUpload.js";

const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.single("cover");

export const postNewEbook = async (req, res) => {
  const { title, dec, link } = req.body;
  const image_title = req.file || "";
  const db = await pool.connect();
  let fileName = "";
  try {
    if (!title) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // Check
    const sqlCheck = `SELECT id FROM ebook WHERE title = $1`;
    const resultCheck = await db.query(sqlCheck, [title]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    if (image_title) {
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        fileName = await uploadImagesAws(image_title)
      }else {
        fileName = await uploadImageFile(image_title);
      }
      
    }
    // บันทึก
    const sql = `INSERT INTO ebook (title, dec, link, image_title) VALUES ($1,$2,$3,$4)`;
    await db.query(sql, [title, dec, link, fileName]);
    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getAllEbook = async (req, res) => {
  const { search, full } = req.body || "";
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM ebook`;
    const resultPage = await db.query(sqlPage);
    const limit = full ? resultPage.rows[0].count : 9;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `SELECT id, title, dec, link, image_title FROM ebook `;
    const params = [limit, offset];

    if (search) {
      sql += ` WHERE title LIKE $3`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY id DESC LIMIT $1 OFFSET $2`;

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
};

export const getEbookById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT title, dec, link, image_title FROM ebook WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const putEbook = async (req, res) => {
  const db = await pool.connect();
  const { id, title, dec, link, old_image } = req.body;
  const image_title = req.file || "";
  let imageName = old_image;

  console.log({old_image});
  

  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // check ซ้ำ
    const sqlCheck = `SELECT id FROM ebook WHERE title = $1 AND id != $2`;
    const resultCheck = await db.query(sqlCheck, [title, id]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    if (image_title) {
      if(old_image){
        // ลบรูปเก่าก่อน
        if(process.env.UPLOAD_CHANGE_TO === "aws"){
          await deleteImageFromAws("images",old_image);
        }else {
          await deleteImageFtp(`/images/${old_image}`);
        }
      }
    
      // เพิ่มรูปใหม่  
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        imageName = await uploadImagesAws(image_title)
      }else {
        imageName = await uploadImageFile(image_title);
      }
        
    }

   const sql = `UPDATE ebook SET title = $1, dec = $2, link = $3, image_title = $4 WHERE id = $5`
   await db.query(sql, [title, dec, link, imageName, id])
   return res.status(200).json({message: 'บันทึกสำเร็จ'})

  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const deleteEbook = async(req,res)=>{
    const {id} = req.params
    const db = await pool.connect()
    try {
        const sqlSearch = `SELECT image_title FROM ebook WHERE id = $1`
        const resultSearch = await db.query(sqlSearch, [id])
        const image = resultSearch.rows[0].image_title || ""
   
        if(image){
          // ลบรูปเก่าก่อน
          if(process.env.UPLOAD_CHANGE_TO === "aws"){
            await deleteImageFromAws("images",image);
          }else {
            await deleteImageFtp(`/images/${image}`);
          }
        }
        
        const sql = `DELETE FROM ebook WHERE id = $1`
        await db.query(sql, [id])
        return res.status(200).json({message : 'ลบสำเร็จ'})

     
        
    } catch (error) {
        console.error(error);
        return res.status(500).json(error.message)
    } finally {
        db.release()
    }
}
