// import pool from "../db/index.js";

import pool from "../db/index.js";

export const reportAdmin = async (req, res) => {
  const { date_start, date_end } = req.body;
  const db = await pool.connect();
  console.log(req.body);

  try {
    if (!date_start && !date_end)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // TypeError: Cannot destructure property 'sales_within_date' of 'result.rows[0]' as it is undefined.
    const query = `
        SELECT  
        (SELECT COALESCE(SUM(price), 0) FROM pay WHERE start_pay BETWEEN $1 AND $2) AS sales_within_date,
        (SELECT COALESCE(COUNT(DISTINCT users_id), 0) FROM pay WHERE start_pay BETWEEN $1 AND $2) AS customer_count,
        products.title AS product_title,
        products.price AS product_price,
        products.image AS product_image
            FROM pay 
            LEFT JOIN products ON pay.products_id = products.id
            WHERE pay.start_pay BETWEEN $1 AND $2 AND pay.status = 1
            GROUP BY products.id 
            ORDER BY COUNT(*) DESC 
            LIMIT 1 
        `;

    const result = await db.query(query, [date_start, date_end]);

    const countAllSum = `SELECT COALESCE(SUM(price), 0) FROM pay `;
    const resultCountAllSum = await db.query(countAllSum);



    // ตั้งค่าค่าเริ่มต้นหาก query ไม่พบข้อมูล
    const total_sales = resultCountAllSum.rows[0]?.coalesce || 0;
    const sales_within_date = result.rows[0]?.sales_within_date || 0;
    const customer_count = result.rows[0]?.customer_count || 0;
    const product_title = result.rows[0]?.product_title || "";
    const product_price = result.rows[0]?.product_price || 0;
    const product_image = result.rows[0]?.product_image || "";

    // ส่งข้อมูลกลับไปยังผู้ใช้
    return res.status(200).json({
      totalSales: total_sales ,
      salesWithinDate: sales_within_date ,
      customerCount: customer_count ,
      topCourse: {
        product_title: product_title ,
        product_price: product_price ,
        product_image: product_image ,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};
