// ไฟล์ ftp.js ของฉัน
import ftp from "basic-ftp";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { PassThrough, Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadToFTP = async (fileBuffer, originalName, directory) => {
  const client = new ftp.Client();
  client.ftp.verbose = true; // เปิดการแสดงข้อความเพิ่มเติมสำหรับการดีบัก
  client.ftp.timeout = 60000; // เพิ่มเวลาหมดเวลาเป็น 60 วินาที

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false,
    });

    let fileName = `${crypto.randomBytes(16).toString("hex")}${path.extname(
      originalName
    )}`;

    if(originalName === "qrcode_for_scan.png"){
      fileName = originalName
    }
    console.log({fileName});
    console.log({originalName});
    
    // สร้าง Readable stream จาก buffer
    const stream = new Readable();
    stream._read = () => {};
    stream.push(fileBuffer);
    stream.push(null);

    await client.uploadFrom(stream, `${directory}/${fileName}`);

    return fileName;

  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    client.close();
  }
};

export default uploadToFTP;

export const deleteImageFtp = async (imagePath) => {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  client.ftp.timeout = 60000;
  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false,
      
    });

    await client.remove(imagePath);
    console.log(`Deleted ${imagePath} successfully`);
    return true
  } catch (error) {
    console.error(`Error deleting file from FTP: ${error.message}`);
    return false
  } 
  
  finally {
    client.close();
  }
};

export const viewVideoFtp = async (fileName, res) => {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false,
    });


    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", "inline");
    await client.downloadTo(res, `/videos/${fileName}`);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "ไม่สามารถดึงไฟล์จาก FTP ได้" });
  } finally {
    client.close();
  }
};
