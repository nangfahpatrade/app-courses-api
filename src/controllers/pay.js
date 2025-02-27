import moment from "moment";
import pool from "../db/index.js";
import slipOk from "slipok";
import multer from "multer";
import { verifySlipAmountAndAccount } from "../libs/checkSlip.js";
import handleImageUpload, { uploadImageFile } from "../libs/uploadFile.js";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { promisify } from "util";
import { deleteImageFtp } from "../libs/ftpClient.js";
import sharp from "sharp";

import dotenv from "dotenv";
import { uploadImagesAws } from "../libs/awsUpload.js";
dotenv.config();

// สร้าง path สำหรับไฟล์ SVG
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });
// upload middleware
export const uploadMiddleware = upload.single("file");

export const getAllPay = async (req, res) => {
  const { search } = req.body;
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const limit = 6;
    const offset = (page - 1) * limit;
    const sqlPage = `SELECT COUNT(id) FROM pay`;
    const resultPage = await db.query(sqlPage);
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `
    SELECT 
    pay.id, 
    pay.code , 
    TO_CHAR(pay.start_pay , 'DD-MM-YYYY') as start_pay , 
    TO_CHAR(pay.end_pay , 'DD-MM-YYYY') as end_pay, 
    pay.status, 
    users.name , 
    products.title ,
    products.price ,
    products.price_sale , 
    pay.image ,
    pay.type

    FROM pay
    LEFT JOIN users ON users.id = pay.users_id
    LEFT JOIN products ON products.id = pay.products_id
    `;

    const params = [limit, offset];
    if (search) {
      sql += ` WHERE pay.code LIKE $3`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY id DESC LIMIT $1 OFFSET $2 `;

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

export const payNewCourses = async (req, res) => {
  const { users_id, product_id } = req.body;

  const db = await pool.connect();
  console.log(req.body);

  try {
    // ตรวจสอบว่าผู้ใช้เคยซื้อหรือไม่
    const sqlCheck = `SELECT id, start_pay, end_pay FROM pay WHERE users_id = $1 AND products_id = $2 ORDER BY id DESC LIMIT 1`;
    const resultCheck = await db.query(sqlCheck, [users_id, product_id]);

    if (resultCheck.rowCount > 0) {
      //ถ้าเคยซื้อเช็คว่า คอร์สหมดอายุยัง
      const courseEndDate = moment(resultCheck.rows[0].end_pay).format(
        "YYYY-MM-DD"
      );
      const dateNow = moment().format("YYYY-MM-DD");
      // console.log({courseEndDate, dateNow});

      // ตรวจสอบว่าคอร์สหมดอายุหรือยัง
      if (courseEndDate >= dateNow) {
        // ถ้าคอร์สยังไม่หมดอายุ ไม่อนุญาตให้ซื้อใหม่
        return res.status(400).json({
          message: "คอร์สยังไม่หมดอายุ หรือยังไม่ได้ชำระเงิน ",
        });
      }
    }

    // ซื้อคอร์สเรียนได้

    const currentYear = new Date().getFullYear();

    // Query หาบิลล่าสุดที่ตรงกับปีปัจจุบัน
    const result = await db.query(
      "SELECT code FROM pay WHERE code LIKE $1 ORDER BY id DESC LIMIT 1",
      [`N${currentYear}-%`]
    );

    let newBillNumber = `N${currentYear}-00001`; // ถ้ายังไม่มีบิลในปีนี้

    if (result.rows.length > 0) {
      // ดึงเลขบิลล่าสุดที่เจอ เช่น N2024-0001
      const lastBillNumber = result.rows[0].code;
      const lastNumber = parseInt(lastBillNumber.split("-")[1]); // "0001"

      // เพิ่ม 1 เพื่อสร้างเลขบิลใหม่
      const newNumber = (lastNumber + 1).toString().padStart(5, "0"); // ใช้ 5 หลัก
      newBillNumber = `N${currentYear}-${newNumber}`; // เช่น N2024-0002
    }

    // บันทึกบิลใหม่

    const resultInsert = await db.query(
      "INSERT INTO pay (code, users_id, products_id, type) VALUES ($1, $2, $3, $4) RETURNING status,id",
      [newBillNumber, users_id, product_id, 1]
    );

    return res.status(200).json({
      message: "บันทึกสำเร็จ",
      bill_number: newBillNumber,
      pay_status: resultInsert.rows[0].status,
      pay_id: resultInsert.rows[0].id,
    });
  } catch (error) {
    // Rollback ถ้าเกิดปัญหา
    await db.query("ROLLBACK");
    console.log(error);
    return res.status(500).json({ error: error.message });
  } finally {
    db.release();
  }
};

export const updateCheckSlip = async (req, res) => {
  const slipBuffer = req.file.buffer;
  const { price, pay_id } = req.body;
  const expectedAmount = price ? price : 1;
  const db = await pool.connect();


  try {
    if (!pay_id || !price) return res.status(400).json({ message: "ส่งข้อมูลมาไม่ครบ" });

    // เช็คว่า ซื้อไปยัง ไม่ให้ซื้อซ้ำ
    const sqlCheck = `SELECT id, status FROM pay WHERE id = $1`;
    const resultCheck = await db.query(sqlCheck, [pay_id]);
    if (resultCheck.rows[0].status > 0)
      return res
        .status(400)
        .json({ message: "คุณแจ้งชำระเงินรายการนี้แล้ว !" });

    if (!slipBuffer) return res.status(400).json({ message: "ไม่พบสลิป" });
    // ตรวจสอบสลิป, ยอดเงิน, และบัญชีผ่าน slipOK
    const isValid = await verifySlipAmountAndAccount(
      slipBuffer,
      expectedAmount
    );

    console.log({isValid});
    

    // ข้อมูลสมมุติ
    // const isValid = {
    //   status: true,
    //   transRef: "014279151200BTF05404",
    // };

    if (isValid.status === false || isValid.status === "undefined" )
      return res
        .status(400)
        .json({ success: false, message: "สลิปไม่ถูกต้อง" });

    // check transRef
    const sqlCheckTransRef = `SELECT id FROM pay WHERE trans_ref = $1`;
    const resultCheckTransRef = await db.query(sqlCheckTransRef, [
      isValid.transRef,
    ]);
    console.log(resultCheckTransRef?.rows[0]?.id);

    if (resultCheckTransRef.rows.length > 0)
      return res.status(400).json({ message: "ใช้สลิปซ้ำ !!!!" });

    console.log("ทำต่อได้");

    // บันทึกรูปสลิป
    let fileName = ""
    if(process.env.UPLOAD_CHANGE_TO === "aws"){
      fileName = await uploadImagesAws(req.file);
    }else {
      fileName = await uploadImageFile(req.file);
    }

    

    // วันที่เริ่มและสิ้นสุดการซื้อ
    const dateNow = moment().format("YYYY-MM-DD");
    const nextYearDate = moment().add(1, "year").format("YYYY-MM-DD");

    const result = await db.query(
      "UPDATE pay SET status = $1, image = $2, start_pay = $3, end_pay = $4, trans_ref= $5, price = $6, type = 1 WHERE id = $7 RETURNING status",
      [1, fileName, dateNow, nextYearDate, isValid.transRef, price, pay_id]
    );
    return res.status(200).json({
      success: true,
      message: "ซื้อคอร์สเรียนสำเร็จ",
      pay_status: result.rows[0].status,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// Users
export const getPayMyUser = async (req, res) => {
  const { users_id, full, search } = req.body;
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM pay WHERE users_id = $1`;
    const resultPage = await db.query(sqlPage, [users_id]);
    const limit = full ? resultPage.rows[0].count : 12;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    console.log(req.body);

    let params = [users_id, limit, offset];
    let conditions = [];
    let paramIndex = 4;
    let sql = `SELECT 
    pay.id as pay_id, code, status , products.title as products_name,
    pay.price as products_price ,
    TO_CHAR(start_pay, 'DD/MM/YYYY') as start_pay  ,
    TO_CHAR(end_pay, 'DD/MM/YYYY') as end_pay  ,
    pay.image as pay_image
    FROM pay 
    LEFT JOIN products ON pay.products_id = products.id
    WHERE pay.users_id = $1 `;

    if (search) {
      conditions.push(`code LIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // ถ้ามีเงื่อนไขเพิ่ม
    if (conditions.length > 0) {
      sql += ` AND  ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY pay.id DESC LIMIT $2 OFFSET $3`;

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

export const checkUserPay = async (req, res) => {
  const { products_id, users_id } = req.body;
  const db = await pool.connect();
  console.log(req.body);

  try {

    // check status 2

    const sql = `
    SELECT 
    id, 
    code, 
    status , 
    type , 
    TO_CHAR(pay.start_pay , 'DD-MM-YYYY') as start_pay , 
    TO_CHAR(pay.end_pay , 'DD-MM-YYYY') as end_pay, 
    price
    FROM pay 
    WHERE  pay.products_id = $1 AND pay.users_id = $2 AND pay.status != 2
    `;
    const result = await db.query(sql, [products_id, users_id]);
    console.log(result.rows[0]);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// สร้าง QR Code และบันทึกเป็น SVG
// QRCode.toFile(svgPath, payload, option, (err) => {
//   if (err) {
//     console.log(err);
//     return res.status(500).json({ error: "ไม่สามารถสร้าง QR Code ได้" });
//   }

//   // ส่ง path ของ QR Code กลับ
//   return res.status(200).json({ qrCodePath: "/qr.svg" });
// });

// next node express ต้องการให้รูปสร้างเสร็จก่อน ค่อย return 200
// export const createQrCode = async (req, res) => {
//   const { price } = req.body;
//   console.log(req.body);
//   const toFilePromise = promisify(QRCode.toFile);

//   try {
//     const mobileNumber = process.env.PROMPTPAY_CODE;
//     const amount = price || 0;
//     const payload = generatePayload(mobileNumber, { amount });
//     // const svgPath = path.join(__dirname, "../../public/qr.svg");

//     // ลบไฟล์ qr.svg เก่าถ้ามีอยู่
//     // if (fs.existsSync(svgPath)) {
//     //   fs.unlinkSync(svgPath);
//     // }
//     const option = { type: "svg", color: { dark: "#000", light: "#fff" } };
//     // สร้าง QR Code และบันทึกเป็น SVG
//     await toFilePromise(svgPath, payload, option);

//     // ส่ง path ของ QR Code กลับ
//     // return res.status(200).json({ qrCodePath: "/qr.svg" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ error: error.message });
//   }
// };

export const createQrCode = async (req, res) => {
  const { price } = req.body;
  // console.log(req.body);
  const toFilePromise = promisify(QRCode.toFile);

  try {
    // ฉันใช้แบบนี้ได้
    // ทำไมสแกนแล้วจำนวนเงินไม่ขึ้น
    const mobileNumber = process.env.PROMPTPAY_CODE;
    // const amount = price || 0;
    const amount = parseInt(price, 10) || 0

    const payload = generatePayload(mobileNumber, { amount });
    const option = { type: "svg", color: { dark: "#000", light: "#fff" } };

    console.log("Generated Payload:", payload);


    // สร้าง QR Code เป็น buffer
    const qrCodeBuffer = await QRCode.toString(payload, option);

    // แปลง SVG เป็น PNG Buffer
    const pngBuffer = await sharp(Buffer.from(qrCodeBuffer))
      .png() 
      .toBuffer();

    let image_question_check = ""

    if (process.env.UPLOAD_CHANGE_TO === "aws") {
      image_question_check = await uploadImagesAws(pngBuffer, "qrcode");
    } else {
      image_question_check = await uploadImageFile(pngBuffer, "qrcode");
    }

    console.log({image_question_check});
    

    return res.status(200).json({ qrCodePath: image_question_check });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};
