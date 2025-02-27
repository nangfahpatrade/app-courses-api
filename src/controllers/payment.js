import Stripe from "stripe";
import pool from "../db/index.js";

import dotenv from "dotenv";
dotenv.config();

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const creditCardCheckout = async (req, res) => {
  const { users_id, product , code } = req.body;
  const db = await pool.connect();

  // Query หาบิลล่าสุดที่ตรงกับปีปัจจุบัน ***************************************************
  const currentYear = new Date().getFullYear();
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
 

  try {
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ["card"],
    //   line_items: [
    //     {
    //       price_data: {
    //         currency: "thb",
    //         product_data: {
    //           name: product.name,
    //         },
    //         unit_amount: product.price * 100,
    //       },
    //       quantity: 1,
    //     },
    //   ],
    //   mode: "payment",
    //   success_url: `${process.env.REDIRECT_TO_FRONTEND}/user/payment/success?id=${newBillNumber}`,
    //   cancel_url: `${process.env.REDIRECT_TO_FRONTEND}/user/payment/cancel`,
    // });

    // console.log({ session });


    const oderData = {
      code: newBillNumber,
      session_id: session.id,
      status: 0,
        // session.status === "open" ? 0 : session.status === "complete" ? 1 : 0,
      users_id,
      products_id: product.id,
    };

    if(code){
      
      await db.query('UPDATE pay SET status = 2 WHERE code = $1', [code])
    }

    const sqlInsert = ` INSERT INTO pay (code, session_id, status , type, price, users_id, products_id) VALUES ($1, $2, $3 , $4, $5, $6, $7) RETURNING * `;
    const resultInsert = await db.query(sqlInsert, [
      oderData.code,
      oderData.session_id,
      oderData.status,
      2,
      product.price,
      oderData.users_id,
      oderData.products_id,
    ]);

    res.status(200).json({
      users_id,
      product,
      session_id: oderData.session_id,
    });
  } catch (error) {
    console.log(error);
  } finally {
    db.release();
  }
};

export const creditCardCheckOrderByid = async (req, res) => {
  const { code } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT status FROM pay WHERE code = $1`;
    const result = await db.query(sql, [code]);
    res.status(200).json(result.rows[0])
  } catch (error) {
    console.log(error);
  } finally {
    db.release();
  }
};


