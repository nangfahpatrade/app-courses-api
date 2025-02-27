import pool from "../db/index.js";
import { deleteImageFromAws, uploadImagesAws } from "../libs/awsUpload.js";
import { deleteImageFtp } from "../libs/ftpClient.js";
import handleImageUpload, { handleVideoUpload } from "../libs/uploadFile.js";

const changeImageForaws = async (image)=>{
  const myImageBase64 = image.replace(/^data:image\/\w+;base64,/, "");
  const bufferDataForAws = Buffer.from(myImageBase64, "base64");
  return bufferDataForAws
}

export const postNewQuestion = async (req, res) => {
  const { question, products_id, products_title_id, new_question_id } = req.body;
  const image_question = req.body.image_question || "";
  const image_answer = req.body.image_answer || "";
  const db = await pool.connect();
  
  try {
    if (!question  || !products_id || !products_title_id)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // เช็คข้อมูลซ้ำ
    let sqlCheck = `SELECT id FROM question WHERE question = $1 AND products_title_id = $2 `;
    let paramsCheck = [question, products_title_id]
    if(new_question_id) {
      sqlCheck +=` AND new_question_id = $3 `
      paramsCheck.push(new_question_id)
    }

    const resultCheck = await db.query(sqlCheck, paramsCheck);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีคำถามนี้แล้ว" });


    let image_question_name = "";
    
    if (image_question !== "") {
      const myImage = await changeImageForaws(image_question)

      // อัพโหลดรูปภาพไปยัง FTP server
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        image_question_name = await uploadImagesAws(myImage);
      }else {
        image_question_name = await handleImageUpload(image_question);
      }
      
    }

    // อัพโหลดรูปภาพไปยัง FTP server
    //await handleImageUpload(image_answer);
    let image_answer_name = ""
      const myImage = await changeImageForaws(image_answer)
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        image_answer_name = await uploadImagesAws(myImage);
      }else {
        image_answer_name = await handleImageUpload(image_answer);
      }

    // บันทึก List
    const sql = `INSERT INTO question (question, products_id, products_title_id, image_question, image_answer, new_question_id  ) VALUES ($1,$2,$3,$4,$5,$6)`;
    await db.query(sql, [
      question,
      products_id,
      products_title_id,
      image_question_name,
      image_answer_name,
      new_question_id ? new_question_id : null
    ]);

    // อัพเดท status Table new_question
    if(new_question_id){
      const sqlUpdate = `UPDATE new_question SET status = 1 WHERE id = $1`
      await db.query(sqlUpdate, [new_question_id])

    }
    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// GET ALL
export const getAllQuestion = async (req, res) => {
  const { search, full } = req.body;
  console.log(search);
  const db = await pool.connect();
  try {
    // paginations
    const page = parseInt(req.body.page) || 1;
    // const sqlPage = `SELECT COUNT(id) FROM question`;
    let sqlPage = `
    SELECT  
        COUNT(question.id) as count
    FROM question 
        JOIN products ON products.id = question.products_id
        GROUP BY question.products_id, products.title ORDER BY question.products_id
    `;
    const resultPage = await db.query(sqlPage);

    const limit = full ? resultPage.rows.length : 3;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows.length);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = `
    SELECT  
        question.products_id,
        products.title,
        COUNT(question.id) as count
    FROM question 
        JOIN products ON products.id = question.products_id
    `;

    const params = [limit, offset];
    if (search) {
      sql += ` WHERE products.title LIKE $3`;
      params.push(`%${search}%`);
    }

    sql += ` GROUP BY question.products_id, products.title ORDER BY question.products_id  LIMIT $1 OFFSET $2`;

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
// เช็คข้อที่
export const getCheckQuestion = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `SELECT COUNT(id) as count FROM question WHERE products_id = $1 `;
    const result = await db.query(sql, [id]);
    return res.status(200).json(parseInt(result.rows[0].count) + 1);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// GET LIST
export const getQuestionList = async (req, res) => {
  const { search, products_id, products_title_id, full, new_question_id  } = req.body;
  const db = await pool.connect();

  try {
    if (!products_id)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // paginations
    const page = parseInt(req.body.page) || 1;
    let sqlPage = `SELECT COUNT(id) FROM question WHERE products_id = $1 AND products_title_id = $2`;
    let paramsPage = [products_id, products_title_id ]

    if(new_question_id) {
      sqlPage += ` AND new_question_id = $3 `
      paramsPage.push(new_question_id)
    }else {
      sqlPage += ` AND new_question_id IS NULL`
    }

    const resultPage = await db.query(sqlPage, paramsPage);
    const limit = full ? resultPage.rows[0].count : 17;
    const offset = (page - 1) * limit;
    const totalItems = parseInt(resultPage.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    let sql = ` SELECT 
    id, question, index, image_question, 
    image_answer, 
    products_id, 
    products_title_id ,
    new_question_id
   
    FROM question 
    WHERE products_id = $1 AND products_title_id = $2 `;

    const params = [products_id, products_title_id];
    if (search) {
      sql += ` AND question LIKE $${params.length + 1}`;
      params.push(`%${search}%`);
      console.log('search : ', params.length + 1);
    }

    if(new_question_id ){
      
      sql += ` AND new_question_id = $${params.length + 1}`;
      params.push(new_question_id);
    } else [
      sql += ` AND new_question_id IS NULL `
    ]

    sql += ` ORDER BY  index ASC  LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(sql, params);

    // หา INDEX ต่อไป
    const sqlIndex = `SELECT COUNT(id) FROM question WHERE products_id = $1 AND products_title_id = $2  `;
    const resultIndex = await db.query(sqlIndex, [
      products_id,
      products_title_id,
    ]);
    return res.status(200).json({
      page,
      limit,
      totalPages,
      totalItems,
      index: parseInt(resultIndex.rows[0].count) + 1,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// GET LIST BY ID
export const getQuestionListById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();

  try {
    const sql = `SELECT 
    question.id as id, 
    question, 
    index, 
    question.products_id as products_id , 
    products_title_id, 
    image_question, 
    image_answer ,
    products.title as products_name ,
    products_title.title as products_title_name 

    FROM question 
    LEFT JOIN products ON question.products_id = products.id
    LEFT JOIN products_title ON question.products_title_id = products_title.id
    WHERE question.id = $1 `;
    const result = await db.query(sql, [id]);
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// Edit LIST BY ID
export const editQuestionListById = async (req, res) => {
  const {
    id,
    question,
    products_id,
    products_title_id,
    image_question,
    image_answer,
  } = req.body;
  const db = await pool.connect();
  console.log({
    id,
    question,
    products_id,
    products_title_id,
    image_question,
    image_answer,
   
  });
  
  
  try {
    if (!id || !products_id)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบz" });

    // check คำถามซ้ำ
    const sqlCheck = `SELECT id FROM question WHERE question = $1 AND id != $2 AND products_id = $3 AND products_title_id = $4 `;
    const resultCheck = await db.query(sqlCheck, [
      question,
      id,
      products_id,
      products_title_id,
    ]);
    if (resultCheck.rows.length > 0)
      return res.status(400).json({ message: "มีคำถามนี้แล้ว" });

    // Check รูปซ้ำ
    const sqlCheckImage = `SELECT image_question, image_answer FROM question WHERE id = $1  `;
    const resultCheckImage = await db.query(sqlCheckImage, [id]);
    let image_question_check = resultCheckImage.rows[0].image_question;
    let image_answer_check = resultCheckImage.rows[0].image_answer;

    // ถ้ามีรูปคำถาม-ใหม่
    if (image_question !== image_question_check) {
      // ลบวีดีโอเก่าก่อน
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        await deleteImageFromAws("images",`${resultCheckImage.rows[0].image_question}`);
      }else {
        await deleteImageFtp(`/images/${resultCheckImage.rows[0].image_question}`); 
      }
      // เพิ่มรูปใหม่
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        const myImage = await changeImageForaws(image_question)
        image_question_check = await uploadImagesAws(myImage);
      }else {
        image_question_check = await handleImageUpload(image_question);
      }
    }


    // ถ้ามีรูปคำตอบ-ใหม่
    if (image_answer !== image_answer_check) {
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        await deleteImageFromAws("images",`${resultCheckImage.rows[0].image_answer}`);
      }else {
        await deleteImageFtp(`/images/${resultCheckImage.rows[0].image_answer}`); // ลบวีดีโอเก่าก่อน
      }
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        const myImage = await changeImageForaws(image_answer)
        image_answer_check = await uploadImagesAws(myImage);
      }else {
        image_answer_check = await handleImageUpload(image_answer);
      }
      
    }

    // บันทึก
    const sql = `UPDATE question SET question = $1, image_question = $2, image_answer = $3  WHERE id = $4`;
    await db.query(sql, [
      question,
      image_question_check,
      image_answer_check,
      id,
    ]);
    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// DELETE LIST BY ID
export const deleteQuestionListById = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    // เช็คว่ามีรูปภาพไหม - เพื่อลบรูปก่อน
    const sqlCheck = `SELECT image_question, image_answer FROM question WHERE id = $1   `;
    const resultCheck = await db.query(sqlCheck, [id]);
    const image_question_check = resultCheck.rows[0].image_question;
    const image_answer_check = resultCheck.rows[0].image_answer;

    if (image_question_check) {
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        await deleteImageFromAws("images",`${resultCheck.rows[0].image_question}`);
      }else {
        await deleteImageFtp(`/images/${resultCheck.rows[0].image_question}`); // ลบวีดีโอเก่าก่อน
      }
      
    }

    if (image_answer_check) {
      if(process.env.UPLOAD_CHANGE_TO === "aws"){
        await deleteImageFromAws("images",`${resultCheck.rows[0].image_answer}`);
      }else {
        await deleteImageFtp(`/images/${resultCheck.rows[0].image_answer}`); // ลบวีดีโอเก่าก่อน
      }
      
    }

    const sql = `DELETE FROM question WHERE id = $1`;
    await db.query(sql, [id]);
    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// ลากเปลี่ยนข้อ
// export const changIndex = async (req, res) => {
//   const { arrData, page } = req.body;
//   const db = await pool.connect();
//   try {
//     const limit = 9;
//     const offset = (page - 1) * limit;
//     const newData = arrData.map((item, index) => ({
//       id: item.id,
//       index: offset + index + 1,
//     }));

//     const sql = `UPDATE question SET index = $1 WHERE id = $2`;
//     for (const item of newData) {
//       await db.query(sql, [item.index, item.id]);
//     }
//     return res.status(200).json({ message: "เปลี่ยนตำแหน่งสำเร็จ" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json(error.message);
//   } finally {
//     db.release();
//   }
// };

// SELECT
export const selectCourses = async (req, res) => {
  const { id } = req.params;
  const db = await pool.connect();
  try {
    const sql = `
    SELECT 
      (SELECT COUNT(id) FROM products_title WHERE products_id = $1) AS count,
      json_agg(json_build_object('id', id, 'title', title, 'products_id', products_id)) AS data
    FROM products_title
    WHERE products_id = $1;
  `;

    const result = await db.query(sql, [id]);

    const need = {
      data: result.rows[0].data,
      index: parseInt(result.rows[0].count) + 1,
    };

    return res.status(200).json(need);
  } catch (error) {
    console.error(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

// new
export const countQuestion = async (req, res) => {
  const db = await pool.connect();
  const number = Number(0);
  try {
    const sql = `SELECT COUNT(id) AS question_count FROM new_question WHERE status = $1`;
    const result = await db.query(sql, [number]);
    return res.status(200).json(Number(result.rows[0].question_count));
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    db.release();
  }
};

export const getNewQuestion = async (req, res) => {
  const db = await pool.connect();
  const { full } = req.body;
  

  // paginations
  const page = parseInt(req.body.page) || 1;
  let sqlPage = `SELECT COUNT(id) FROM new_question  `;
  if (full) {
    sqlPage += ` `;
  } else {
    sqlPage += ` WHERE status = 0`;
  }
  const resultPage = await db.query(sqlPage);
  const limit = full ? resultPage.rows[0].count : 10;
  const offset = (page - 1) * limit;
  const totalItems = parseInt(resultPage.rows[0].count);
  const totalPages = Math.ceil(totalItems / limit);

  try {
    let sql = `SELECT 
    new_question.id as id, 
    users_id,
    users.name as name,
     new_question.products_id as products_id , 
     products_title_id ,
     products.title as products_title ,
     products_title.title as products_title_name ,
     new_question.status as status 
     FROM new_question 
     LEFT JOIN products ON new_question.products_id = products.id
     LEFT JOIN products_title ON new_question.products_title_id = products_title.id
     LEFT JOIN users ON new_question.users_id = users.id
     
     `;

    let params = [limit, offset];
    if (full) {
      sql += ` `;
    } else {
      sql += ` WHERE new_question.status = 0`;
    }

    sql += ` ORDER BY  new_question.id ASC  LIMIT $1 OFFSET $2`;


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

export const addNewQuestion = async(req,res)=>{
  const {status, users_id, products_id, products_title_id} = req.body
  console.log(req.body);
  
  const db = await pool.connect()
  try {
    if(status !== 0 || !users_id || !products_id || !products_title_id) return res.status(400).json({message : 'ส่งข้อมูลไม่ครบ'})

      const sql = `INSERT INTO new_question (status, users_id,  products_id, products_title_id) VALUES ($1, $2, $3, $4)`
      await db.query(sql, [
        status ? status : 0,
        users_id,
        products_id,
        products_title_id
      ])
      return res.status(200).json({message : 'บันทึกสำเร็จ'})
      
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message)
    
  }finally {
    db.release()
  }
}

export const getMyNewQuestion = async(req,res)=> {
  const db = await pool.connect()
  try {
    const {users_id, products_title_id} = req.params
    console.log(req.params);
    

    

    const sql = `SELECT id, status, products_id, products_title_id FROM new_question WHERE users_id = $1 AND products_title_id = $2 `
    const result = await pool.query(sql, [users_id, products_title_id])
    return res.status(200).json(result.rows)
  
    
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message)
    
  } finally {
    db.release()
  }
}

export const deleteNewQuestion = async(req,res)=> {
  const {id} = req.params
  const db = await pool.connect()
  
  try {
    // ลบ List
    const sqlDeleteList = `DELETE FROM question WHERE new_question_id = $1 `
    await db.query(sqlDeleteList, [id])

    // ลบ Title
    const sqlDeleteTitle = `DELETE FROM new_question WHERE id = $1 `
    await db.query(sqlDeleteTitle, [id])

    return res.status(200).json({message: 'ลบสำเร็จ'})
    
  } catch (error) {
    console.log(error);
    return res.status(500).json(error)
    
  }finally {
    db.release()
  }
}