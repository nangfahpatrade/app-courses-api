import pool from "../db/index.js";
import multer from "multer";
import handleImageUpload, { handleVideoUpload } from "../libs/uploadFile.js";
import { deleteImageFtp } from "../libs/ftpClient.js";
import { createTemporaryUrl } from "../libs/userAndVideos.js";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  deleteImageFromAws,
  showDataInAws,
  uploadImagesAws,
  uploadVideoAWS,
} from "../libs/awsUpload.js";

const upload = multer({ storage: multer.memoryStorage() });

// AWS
const uploadForAws = multer({});
export const upload_aws = uploadForAws.single("file");
export const upload_video_aws = uploadForAws.single("video");

// test image aws
export const SendImageToAws = async (req, res) => {
  try {
    const result = await uploadImagesAws(req.file);
    res.status(200).json({ url: result });
  } catch (error) {
    res.status(500).send("Error uploading file");
  }
};

// test video aws
export const SendVideoToAws = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No video file uploaded.");
    }
    const result = await uploadVideoAWS(req.file);
    res.status(200).json({ url: result });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error uploading video: " + error.message);
  }
};

// test get video
export const ShowDataFromAws = async (req, res) => {
  const db = await pool.connect()
  try {
    const { id } = req.params;

    const sql = 'SELECT videos FROM products_videos WHERE id = $1'
    const result = await db.query(sql, [id])
    const thisVideos = result.rows[0].videos
    if(!thisVideos) return res.status(400).json({message : 'ไม่พบวีดีโอที่ต้องการ'})
    
    

    const presignedUrl = await showDataInAws(thisVideos);
    res.status(200).json({ url: presignedUrl });
  } catch (error) {
    console.log(error);

    res.status(500).send("Error generating video URL: " + error.message);
  } finally {
    db.release()
  }
}; 

// upload middleware
export const uploadMiddleware = upload.single("video");

// add corses
export const addNewProduct = async (req, res) => {
  const { title, dec, price, price_sale, image, category_id, youtube } =
    req.body;
  // const videoFile = req.file;
  const db = await pool.connect();
  console.log(req.body);

  try {
    // เช็คข้อมูลซ้ำ
    const sqlCheck = `SELECT id FROM products WHERE title = $1`;
    const resultCheck = await db.query(sqlCheck, [title]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีคอร์สเรียนนี้แล้ว" });

    const inputImage = image.replace(/^data:image\/\w+;base64,/, "");
    const bufferData = Buffer.from(inputImage, "base64");
    let imageName = "";

    // UPLOAD
    if (process.env.UPLOAD_CHANGE_TO === "aws") {
      imageName = await uploadImagesAws(bufferData);
    } else {
      imageName = await handleImageUpload(image);
    }

    // บันทึกข้อมูลลงฐานข้อมูล
    const result = await db.query(
      "INSERT INTO products (title, dec, price, price_sale, image, category_id, youtube) VALUES ($1, $2, $3, $4, $5,$6, $7) RETURNING id ",
      [title, dec, price, price_sale, imageName, category_id, youtube]
    );

    return res
      .status(200)
      .json({ message: "บันทึกสำเร็จ", id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// add corses-title-video

export const getAllProducts = async (req, res) => {
  const { search, full, category_id } = req.body;
  const db = await pool.connect();
  console.log(req.body);

  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM products`;
    const resultPage = await db.query(sqlPage);
    const limit = full ? resultPage.rows[0].count : 20;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `SELECT products.id, title, dec, price, price_sale,image, video, youtube ,  category.id as category_id  ,  category.name as category_name
    FROM products
     LEFT JOIN category ON products.category_id = category.id
    `;
    const params = [limit, offset];
    let conditions = [];
    let paramIndex = 3;

    if (search) {
      conditions.push(`title LIKE $${paramIndex}`);
      params.push(`${search}%`);
      paramIndex++;
    }

    if (category_id > 0) {
      conditions.push(`category_id = $${paramIndex}`);
      params.push(category_id);
      paramIndex++;
      console.log("111111111");
    }

    // ถ้ามีเงื่อนไขเพิ่ม
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    // if(search && category_id) {
    //   sql += ` WHERE title LIKE $3 AND category_id = $4 `
    //   params.push(`%${search}%`, category_id );
    // }

    sql += ` ORDER BY products.id DESC  LIMIT $1 OFFSET $2`;

    const result = await db.query(sql, params);
    // console.log(result.rows);

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

export const getProductById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    // const sql = `SELECT id, title, dec, price, price_sale,image, video, category_id FROM products WHERE id = $1`;

    const sql = `
    WITH video_counts AS (
        SELECT 
            products_title.id as products_title_id, 
            COUNT(DISTINCT products_videos.id) as video_count
        FROM products_title
        LEFT JOIN products_videos ON products_title.id = products_videos.products_title_id
        GROUP BY products_title.id
    )
    SELECT  
        products.id as product_id, 
        products.image as product_image, 
        products.title as product_title, 
        products.dec as product_dec, 
        products.price as products_price,
        products.price_sale as products_price_sale,
        products.youtube as products_youtube,
        category.name as category_name,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'title', products_title.title,
                'video_count', COALESCE(video_counts.video_count, 0)
            )
        ) AS result_list
    FROM products
    JOIN category ON products.category_id = category.id
    LEFT JOIN products_title ON products.id = products_title.products_id
    LEFT JOIN video_counts ON products_title.id = video_counts.products_title_id
    WHERE products.id = $1
    GROUP BY products.id, category.name, products.image, product_title, product_dec, products_price, products_price_sale, products_youtube
    ORDER BY products.id DESC
    LIMIT 1`;

    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);

    // const result = await db.query(sql, [id]);
    // return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const deleteProductById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  console.log(id);

  try {
    const sqlCheck = `SELECT id, image FROM products WHERE id = $1`;
    const resultCheck = await db.query(sqlCheck, [id]);
    const data = resultCheck.rows[0];

    if (!data.id)
      return res.status(400).json({ message: "ไม่พบข้อมูลที่ต้องการลบ" });

    const sqlSelectProductsTitle = `SELECT id FROM products_title WHERE products_id = $1 `;
    const resultawaitProductsTitle = await db.query(sqlSelectProductsTitle, [
      id,
    ]);

    if (resultawaitProductsTitle?.rows[0]?.id) {
      // Check Videos TB products_videos
      const sqlCheckVideos = `SELECT id, videos FROM products_videos WHERE products_title_id = $1`;
      const resultCheckVideos = await db.query(sqlCheckVideos, [
        resultawaitProductsTitle.rows[0].id,
      ]);
      // console.log(data.image);

      if (data.image) {
        await deleteImageFtp(`/images/${data.image}`);
      }

      for (const item of resultCheckVideos.rows) {
        // console.log(item.videos);
        await deleteImageFtp(`/videos/${item.videos}`);
      }

      // ลบ TB products_videos ลบจาก products_title_id
      const sqlDeleteProductsVideos = `DELETE FROM products_videos WHERE products_title_id = $1 `;
      await db.query(sqlDeleteProductsVideos, [
        resultawaitProductsTitle.rows[0].id,
      ]);
    }

    // ลบ TB products_title
    const sqlDeleteProductsTitle = `DELETE FROM products_title WHERE products_id = $1`;
    await db.query(sqlDeleteProductsTitle, [id]);

    // ลบ TB new_question
    const sqlDeleteNewQuestion = `DELETE FROM new_question WHERE products_id = $1`;
    await db.query(sqlDeleteNewQuestion, [id]);

    // ลบ TB question
    const sqlDeleteQuestion = `DELETE FROM question WHERE products_id = $1`;
    await db.query(sqlDeleteQuestion, [id]);

    // ลบ Products
    const sqlDeleteProducts = `DELETE FROM products WHERE id = $1`;
    await db.query(sqlDeleteProducts, [id]);

    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const editProductByid = async (req, res) => {
  const { id, title, dec, price, price_sale, image, category_id, youtube } =
    req.body;
  const db = await pool.connect();
  console.log(req.body);

  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลมาไม่ครบ" });

    // เช็คไม่ให้ข้อมูลซ้ำ ยกเว้นตัวเอง
    const sqlCheck = `SELECT id FROM products WHERE title = $1 AND id != $2`;
    const resultCheck = await db.query(sqlCheck, [title, id]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีหัวข้อนี้แล้ว" });

    // ดึงข้อมูลรูป และวีดีโอเก่า
    const sqlOld = `SELECT id, image, video FROM products WHERE id = $1`;
    const resultOld = await db.query(sqlOld, [id]);

    let imageName = resultOld.rows[0].image;

    if (image !== imageName) {
      let deleteOldImage = null;

      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        deleteOldImage = await deleteImageFromAws("images", imageName);
      } else {
        deleteOldImage = await deleteImageFtp(`/images/${imageName}`);
      }

      const myImageBase64 = image.replace(/^data:image\/\w+;base64,/, "");
      const bufferData = Buffer.from(myImageBase64, "base64");

      if (deleteOldImage) {
        imageName =
          process.env.UPLOAD_CHANGE_TO === "aws"
            ? await uploadImagesAws(bufferData)
            : await handleImageUpload(image);
      } else {
        imageName =
          process.env.UPLOAD_CHANGE_TO === "aws"
            ? await uploadImagesAws(bufferData)
            : await handleImageUpload(image);
      }
    }

    // บันทึกลง SQL
    const sql = `UPDATE products SET title = $1, dec = $2, price = $3, price_sale = $4, image = $5,  category_id = $6, youtube = $7 WHERE id = $8`;
    await db.query(sql, [
      title,
      dec,
      price,
      price_sale,
      imageName,
      category_id,
      youtube,
      id,
    ]);
    return res.status(200).json({ message: "แก้ไขสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// PRODUCTS TITLE
export const addNewProductTitle = async (req, res) => {
  const { title, products_id } = req.body;
  const db = await pool.connect();
  try {
    if (!products_id || !title)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // check ซ้ำ
    const sqlCheck = `SELECT * FROM products_title WHERE title = $1 AND products_id = $2`;
    const resultCheck = await db.query(sqlCheck, [title, products_id]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    // บันทึก
    const sql = `INSERT INTO products_title (title, products_id) VALUES ($1, $2) RETURNING id`;
    const result = await db.query(sql, [title, products_id]);
    return res
      .status(200)
      .json({ message: "บันทึกสำเร็จ", id: result.rows[0].id });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getAllProductsTitle = async (req, res) => {
  const { products_id, full } = req.body;
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM products_title WHERE products_id = $1`;
    const resultPage = await db.query(sqlPage, [products_id]);
    const limit = full ? resultPage.rows[0].count : 5;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `SELECT id, title FROM products_title WHERE products_id = $1  LIMIT $2 OFFSET $3`;
    const result = await db.query(sql, [products_id, limit, offset]);
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

export const getProductsTitleById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT id, title, products_id FROM products_title WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const putProductsTitle = async (req, res) => {
  const { id, title, products_id } = req.body;
  const db = await pool.connect();
  try {
    if (!id || !title || !products_id)
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

    // Check ซ้ำ
    const sqlCheck = `SELECT id FROM products_title WHERE title = $1 AND products_id = $2 AND id != $3`;
    const resultCheck = await db.query(sqlCheck, [title, products_id, id]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    // UPDATE
    const sql = `UPDATE products_title SET title = $1 WHERE id = $2 RETURNING id`;
    const result = await db.query(sql, [title, id]);
    return res
      .status(200)
      .json({ message: "แก้ไขสำเร็จ", id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const deleteProductTitle = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `DELETE FROM products_title WHERE id = $1`;
    await db.query(sql, [id]);
    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// PRODUCTS VIDEO
export const addNewProductsVideos = async (req, res) => {
  const { products_title_id } = req.body;
  const videoFile = req.file;
  const db = await pool.connect();

  try {
    if (!videoFile) {
      return res.status(400).json({ message: "Video file is required" });
    }
    // อัพโหลดวีดีโอไปยัง FTP server
    let videoName = "";
    if (process.env.UPLOAD_CHANGE_TO === "aws") {
      videoName = await uploadVideoAWS(videoFile);
    } else {
      videoName = await handleVideoUpload(videoFile);
    }

    const result = await db.query(
      "INSERT INTO products_videos (videos, products_title_id) VALUES ($1, $2)  ",
      [videoName, products_title_id]
    );

    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getAllProductsVideos = async (req, res) => {
  const { products_title_id, full } = req.body;
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM products_videos WHERE products_title_id = $1`;
    const resultPage = await db.query(sqlPage, [products_title_id]);
    const limit = full ? resultPage.rows[0].count : 4;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `SELECT id, videos FROM products_videos WHERE products_title_id = $1  LIMIT $2 OFFSET $3`;
    const result = await db.query(sql, [products_title_id, limit, offset]);
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

export const getProductsVideosById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT id, videos, products_title_id FROM products_videos WHERE id = $1`;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const editProductsVideos = async (req, res) => {
  const { id, products_title_id } = req.body;
  const videoFile = req.file;
  const db = await pool.connect();
  try {
    // ดึงข้อมูลรูป และวีดีโอเก่า
    const sqlOld = `SELECT id, videos FROM products_videos WHERE id = $1`;
    const resultOld = await db.query(sqlOld, [id]);

    let videoName = resultOld.rows[0].videos;

    if (videoFile) {
      if (process.env.UPLOAD_CHANGE_TO === "aws") {
        await deleteImageFromAws("videos", resultOld.rows[0].videos);
        videoName = await uploadVideoAWS(videoFile);
      } else {
        await deleteImageFtp(`/videos/${resultOld.rows[0].videos}`); // ลบวีดีโอเก่าก่อน
        videoName = await handleVideoUpload(videoFile);
      }
    }

    // บันทึกลง SQL
    const sql = `UPDATE products_videos SET videos = $1 WHERE id = $2`;
    await db.query(sql, [videoName, id]);
    return res.status(200).json({ message: "แก้ไขสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  }
};

export const deleteProductVideoById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sqlCheck = `SELECT videos FROM products_videos WHERE id = $1`;
    const resultCheck = await db.query(sqlCheck, [id]);
    const data = resultCheck.rows[0];
    if (!data)
      return res.status(400).json({ message: "ไม่พบข้อมูลที่ต้องการลบ" });

    await deleteImageFtp(`/videos/${data.videos}`);
    const sql = `DELETE FROM products_videos WHERE id = $1`;
    await db.query(sql, [id]);
    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// User GET Videso
export const userGetVideo = async (req, res) => {
  const { products_id, products_title_id, products_videos_id, users_id } =
    req.body;
  const db = await pool.connect();
  try {
    // 1 ตรวจสอบว่าผู้ใช้ได้ซื้อคอร์สหรือไม่
    const coursePurchased = await pool.query(
      "SELECT id FROM pay WHERE users_id = $1 AND products_id = $2",
      [users_id, products_id]
    );

    if (coursePurchased.rowCount === 0) {
      return res.status(403).json({
        message: "คุณยังไม่ได้ซื้อคอร์สเรียนนี้",
      });
    }

    // 2. ตรวจสอบว่าหัวข้อและวิดีโออยู่ในคอร์สที่ถูกต้อง
    const sqlCheckvideo = ` 
    SELECT v.id, v.videos 
    FROM products_videos v
    JOIN products_title t ON v.products_title_id = t.id
    JOIN products c ON t.products_id = c.id
    WHERE v.id = $1 AND t.id =$2 AND c.id = $3
    `;
    const resultCheckvideo = await db.query(sqlCheckvideo, [
      products_videos_id,
      products_title_id,
      products_id,
    ]);

    if (resultCheckvideo.rowCount === 0) {
      return res.status(404).json({ message: "ไม่พบวิดีโอที่ต้องการ" });
    }

    const videoPath = resultCheckvideo.rows[0].videos;

    // 3. ตรวจสอบ token สำหรับผู้ใช้และวิดีโอ
    const existingTokenQuery = `
      SELECT token, exp 
      FROM video_tokens 
      WHERE products_videos_id = $1 AND users_id = $2
    `;
    const tokenResult = await db.query(existingTokenQuery, [
      products_videos_id,
      users_id,
    ]);

    let temporaryVideoUrl;
    if (
      tokenResult.rowCount === 0 ||
      Date.now() > parseInt(tokenResult.rows[0].exp, 10)
    ) {
      console.log(`11111111111`);

      // ถ้าไม่มี token หรือ token หมดอายุแล้ว ให้สร้าง token ใหม่
      const token = crypto.randomBytes(20).toString("hex");
      const expiresAt = Date.now() + 300 * 1000; // 5 นาที

      // อัปเดต token ใหม่ลงฐานข้อมูล
      const insertTokenQuery = `
        INSERT INTO video_tokens (token, products_videos_id, users_id, exp) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (products_videos_id, users_id) 
        DO UPDATE SET token = $1, exp = $4
      `;
      await db.query(insertTokenQuery, [
        token,
        products_videos_id,
        users_id,
        expiresAt,
      ]);

      temporaryVideoUrl = `http://203.146.252.205/videos/${videoPath}?token=${token}&expires=${expiresAt}`;
    } else {
      console.log(`22222222222222222`);
      // ถ้า token ยังไม่หมดอายุ ใช้ token เดิม
      const { token, exp } = tokenResult.rows[0];
      temporaryVideoUrl = `http://203.146.252.205/videos/${videoPath}?token=${token}&expires=${exp}`;
    }

    return res.status(200).json({ url: temporaryVideoUrl });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// ขอวีดีโอ
