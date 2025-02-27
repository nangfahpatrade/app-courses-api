import pool from "../db/index.js";
import multer from "multer";
import { uploadImageFile } from "../libs/uploadFile.js";
import { deleteImageFtp } from "../libs/ftpClient.js";
import { deleteImageFromAws, uploadImagesAws } from "../libs/awsUpload.js";

const upload = multer({ storage: multer.memoryStorage() });

export const uploadMiddleware = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "album", maxCount: 10 },
]);
export const postNewActivity = async (req, res) => {
  const db = await pool.connect();
  const { title, dec } = req.body;
  const coverFile = req.files["cover"] ? req.files["cover"][0] : null;
  const albumFiles = req.files["album"];
  let fileName = "";
  let finenameArr = [];

  try {
    if (!title || !dec || !coverFile)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // เช็คข้อมูลซ้ำ
    const sqlCheck = `SELECT id FROM activity WHERE title = $1`;
    const resultCheck = await db.query(sqlCheck, [title]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    if (coverFile) {
      // เพิ่มรูปใหม่ไป - รูปปก
      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        fileName = await uploadImagesAws(coverFile);
      } else {
        fileName = await uploadImageFile(coverFile);
      }
    }

    if (albumFiles) {
      for (const file of albumFiles) {
        let name = "";
        // เพิ่มรูปใหม่ไป - รายการ
        if (process.env.UPLOAD_CHANGE_TO === "aws") {
          name = await uploadImagesAws(file);
        } else {
          name = await uploadImageFile(file);
        }

        finenameArr.push(name);
      }
    }

    // บันทึก
    const sql = `INSERT INTO activity (title, dec, image_title) VALUES ($1,$2,$3) RETURNING id`;
    const result = await db.query(sql, [title, dec, fileName]);
    const newId = result.rows[0].id;

    // บันทึก รูป arr
    const sqlArr = `INSERT INTO activity_image (activity_id, image) VALUES ($1, $2)  `;

    for (const fileName of finenameArr) {
      const albumValues = [newId, fileName];
      await db.query(sqlArr, albumValues);
    }

    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getAllActivity = async (req, res) => {
  const { search, full } = req.body || "";
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM activity`;
    const resultPage = await db.query(sqlPage);
    const limit = full ? resultPage.rows[0].count : 8;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `SELECT id, title, dec, image_title FROM activity `;
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

export const getActivityByid = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT id, title, dec, image_title FROM activity WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const deleteActivityById = async (req, res) => {
  const db = await pool.connect();
  const { id } = req.params;
  try {
    // เช็ครูปปก
    const sql = `SELECT id, image_title FROM activity WHERE id = $1`;
    const result = await db.query(sql, [id]);

    // เช็ครูป รายการย่อย
    const sqlList = `SELECT image FROM activity_image WHERE activity_id = $1`;
    const resultList = await db.query(sqlList, [id]);
    // console.log(resultList.rows);

    const image_title = result.rows[0].image_title;
    // ลบรูป-หน้าปก
    if (image_title) {
      // ลบรูปเก่าก่อน - รูปปก
      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        await deleteImageFromAws("images", image_title);
      } else {
        await deleteImageFtp(`/images/${image_title}`);
      }
    }
    // ลบรูป-รายการ
    if (resultList.rows.length > 0) {
      for (const name of resultList.rows) {
        // ลบรูปเก่าก่อน - รายการ
        if (process.env.UPLOAD_CHANGE_TO === "aws") {
          await deleteImageFromAws("images", name.image);
        } else {
          await deleteImageFtp(`/images/${name.image}`);
        }
      }
    }

    // ลบข้อมูล - หัว
    const sqlDelete = `DELETE FROM activity WHERE id = $1`;
    await db.query(sqlDelete, [id]);
    // ลบข้อมูล - รายการ
    const sqlDeleteList = `DELETE FROM activity_image WHERE activity_id = $1`;
    await db.query(sqlDeleteList, [id]);
    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const putActivity = async (req, res) => {
  const { id, title, dec } = req.body;
  const delete_image = JSON.parse(req.body.delete_image || "[]");
  console.log(req.body);
  console.log(delete_image);
  const coverFile = req.files["cover"] ? req.files["cover"][0] : null;
  const albumFiles = req.files["album"];
  let fileName = "";
  let finenameArr = [];

  const db = await pool.connect();
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // เช็คข้อมูลซ้ำ
    const sqlCheck = `SELECT id FROM activity WHERE title = $1 AND id != $2`;
    const resultCheck = await db.query(sqlCheck, [title, id]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    // เช็ครูป-หัว
    const sqlCheckHead = `SELECT image_title FROM activity WHERE id = $1`;
    const resultCheckHead = await db.query(sqlCheckHead, [id]);
    let nameImage_title = resultCheckHead.rows[0].image_title;

    // เช็คมีรูปที่จะลบไหม
    if (delete_image.length > 0) {
      const sqlDeleteImageList = `DELETE FROM activity_image WHERE id = $1`;
      for (const item of delete_image) {
        // ลบรูปเก่าก่อน - รายการ
        if (process.env.UPLOAD_CHANGE_TO === "aws") {
          await deleteImageFromAws("images", item.image);
        } else {
          await deleteImageFtp(`/images/${item.image}`);
        }
        // SQL ลบ
        await db.query(sqlDeleteImageList, [item.id]);
      }
    }

    if (coverFile) {
      // ลบรูปเก่าก่อน - รูปปก
      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        await deleteImageFromAws("images", resultCheckHead.rows[0].image_title);
      } else {
        await deleteImageFtp(`/images/${resultCheckHead.rows[0].image_title}`);
      }

      // เพิ่มรูปใหม่ไป - รูปปก
      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        nameImage_title = await uploadImagesAws(coverFile);
      } else {
        nameImage_title = await uploadImageFile(coverFile);
      }
      
    }

    if (albumFiles) {
      const sqlList = `INSERT INTO activity_image (image, activity_id) VALUES ($1,$2)`;

      for (const file of albumFiles) {
        let name = ""
      // เพิ่มรูปใหม่ไป - รูปปก
      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        name = await uploadImagesAws(file);
      } else {
        name = await uploadImageFile(file);
      }

        // finenameArr.push(name);
        // SQL เพิ่มรูปใหม่-รายการ
        await db.query(sqlList, [name, id]);
      }
    }

    // บันทึกข้อมูล
    const sql = `UPDATE activity SET title = $1, dec = $2, image_title = $3 WHERE id = $4`;
    await db.query(sql, [title, dec, nameImage_title, id]);

    return res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.error(error);
    return req.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getActivityImageList = async (req, res) => {
  const { activity_id } = req.params;
  const db = await pool.connect();

  try {
    const sql = `SELECT id, image FROM activity_image WHERE activity_id = $1`;
    const result = await db.query(sql, [activity_id]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};
