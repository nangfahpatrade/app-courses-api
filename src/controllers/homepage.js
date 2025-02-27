import pool from "../db/index.js";

// Courses
export const getNewCourses = async (req, res) => {
  const db = await pool.connect();
  const { full, search, filter_price, category_id } = req.body;

  console.log(req.body);
  
  

  try {
    // paginations
    let paramsPagination = []
    const page = parseInt(req.body.page) || 1;
    let sqlPage = `SELECT COUNT(id) FROM products`;
    if(category_id) {
      sqlPage += ' WHERE category_id = $1 '
      paramsPagination.push(category_id)
    }
    const resultPage = await db.query(sqlPage, paramsPagination);
    const limit = full ? resultPage.rows[0].count : 12;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let params = [limit, offset];
    let conditions = [];
    let paramIndex = 3;
    let sql = `SELECT 
    products.id as id, 
    image, 
    title, 
    category_id, 
    price, 
    price_sale ,
    category.name as category_name
    FROM products
    LEFT JOIN category ON products.category_id = category.id
    `;

    if (search) {
      conditions.push(`products.title LIKE $${paramIndex}`);
      params.push(`${search}%`);
      paramIndex++;
    }
    if(category_id) {
      conditions.push(`products.category_id = $${paramIndex}`);
      params.push(category_id);
      paramIndex++;
    }

    // ถ้ามีเงื่อนไขเพิ่ม
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY products.price ${
      filter_price === 1 ? "ASC" : "DESC"
    } LIMIT $1 OFFSET $2`;

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

export const getNewCoursesById = async (req, res) => {
  const db = await pool.connect();
  const { id } = req.params;

  try {
    // error: column "products.image" must appear in the GROUP BY clause or be used in an aggregate function
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
        GROUP BY 
          products.id, 
          products.image, 
          products.title, 
          products.dec, 
          products.price, 
          products.price_sale, 
          products.youtube, 
          category.name
        ORDER BY products.id DESC
        LIMIT 1`;

    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// News
export const getNews = async (req, res) => {
  const db = await pool.connect();
  const { full, search, home } = req.body;
  console.log(req.body);

  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM activity`;
    const resultPage = await db.query(sqlPage);
    const limit = full ? resultPage.rows[0].count : home ? 3 : 12;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let params = [limit, offset];
    let conditions = [];
    let paramIndex = 3;
    let sql = `SELECT id, image_title, title, dec FROM activity `;

    if (search) {
      conditions.push(`title LIKE $${paramIndex}`);
      params.push(`${search}%`);
      paramIndex++;
    }

    // ถ้ามีเงื่อนไขเพิ่ม
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
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
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getNewsById = async (req, res) => {
  const db = await pool.connect();
  const { id } = req.params;

  try {
    const sql = `SELECT 
        activity.id as activity_id, 
        image_title, 
        title, 
        dec ,
        COALESCE(ARRAY_AGG(activity_image.image) , '{}') AS result_list
        FROM activity 
        LEFT JOIN activity_image ON activity.id = activity_image.activity_id
        WHERE activity.id = $1 
        GROUP BY activity.id, activity.image_title, activity.title, activity.dec
        ORDER BY activity.id DESC  
        LIMIT 1`;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// Category
export const getCategory = async (req, res) => {
  const db = await pool.connect();
  try {
    const sql = `SELECT id, name FROM category`;
    const result = await db.query(sql);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// Ebook
export const getEbook = async (req, res) => {
  const db = await pool.connect();
  const { full, search } = req.body;
  console.log(req.body);

  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM ebook`;
    const resultPage = await db.query(sqlPage);
    const limit = full ? resultPage.rows[0].count : 12;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let params = [limit, offset];
    let conditions = [];
    let paramIndex = 3;
    let sql = `SELECT id, link, image_title, title, dec FROM ebook `;

    if (search) {
      conditions.push(`title LIKE $${paramIndex}`);
      params.push(`${search}%`);
      paramIndex++;
    }

    // ถ้ามีเงื่อนไขเพิ่ม
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
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
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// Review
export const getReviews = async (req, res) => {
  const db = await pool.connect();
  const { full, search, type } = req.body;
  console.log(req.body);
  const newType = type ? type : 0;
  console.log(req.body);

  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    const sqlPage = `SELECT COUNT(id) FROM reviews WHERE type = $1`;
    const resultPage = await db.query(sqlPage, [newType]);
    const limit = full ? resultPage.rows[0].count : 12;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let params = [newType, limit, offset];
    let conditions = [];
    let paramIndex = 4;
    let sql = `SELECT id,  image_title, title, dec FROM reviews WHERE type = $1 `;

    if (search) {
      conditions.push(`title LIKE $${paramIndex}`);
      params.push(`${search}%`);
      paramIndex++;
    }

    // ถ้ามีเงื่อนไขเพิ่ม
    if (conditions.length > 0) {
      sql += ` AND ` + conditions.join(" AND ");
    }

    sql += ` ORDER BY id DESC LIMIT $2 OFFSET $3`;

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

export const getReviewsById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `
    SELECT 
    reviews.id as id,
    reviews.title as reviews_title,
    dec, image_title,
    COALESCE(ARRAY_AGG(reviews_image.image), '{}') as result_list
    FROM reviews
    JOIN reviews_image ON reviews.id = reviews_image.reviews_id
    WHERE reviews.id = $1 
    GROUP BY reviews.id, reviews.title, reviews.dec, reviews.image_title
    `;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// Top_4
export const showTop4 = async (req, res) => {
  const { name, id } = req.body;
  const db = await pool.connect();
  try {
    if (!id && !name)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    let sql = ``;
    if (name === "products") {
      sql += ` SELECT id, title, dec, image FROM products WHERE id != $1`;
    } else if (name === "activity") {
      sql += ` SELECT id, title, dec, image_title FROM activity WHERE id != $1`;
    } else if (name === "reviews"){
      sql += ` SELECT id, title, dec, image_title FROM reviews WHERE id != $1`;
    }

    sql += ` ORDER BY id DESC LIMIT 4`;
    const result = await db.query(sql, [id]);

    return res.status(200).json(result.rows)
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};
