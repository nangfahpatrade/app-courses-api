import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { v4 as uuidv4 } from "uuid";

import dotenv from "dotenv";
dotenv.config();

const changFileName = (path, fileName) => {
  // { fullPath: 'ede2bbdd-8177-4a52-98ad-442cc59f4365-.png' }
  const fileExtension = fileName ? fileName.split(".").pop() : ".png";
  const uniqueFileName = `${
    path ? `${path}/` : ""
  }${uuidv4()}-.${fileExtension}`;
  return uniqueFileName;
};

// ตั้งค่า S3 Client
const s3Client = new S3Client({
  region: "sgp1",
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEYS,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const uploadImagesAws = async (file, type) => {
  let fullPath = "";
  if (type === "qrcode") {
    fullPath = "qrcode_scan.png";
  } else {
    fullPath = changFileName("", file.originalname);
  }

  const fileName = fullPath.split("/").pop();

  const params = {
    Bucket: "images", // ชื่อ Bucket
    Key: fullPath,
    Body: file.buffer,
    ACL: "public-read",
    ContentType: file.mimetype || "image/png",
    CacheControl: "no-cache, no-store, must-revalidate",
    Expires: new Date(0), // ทำให้หมดอายุทันที
  };

  try {
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    console.log("File uploaded successfully:", result);
    return fileName;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const uploadVideoAWS = async (file) => {
  const fullPath = changFileName("", file.originalname);
  const fileName = fullPath.split("/").pop();

  const params = {
    Bucket: "videos",
    Key: fullPath,
    Body: file.buffer,
    ACL: "private",
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    console.log("Video uploaded successfully:", result);
    return fileName;
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
};

export const showDataInAws = async (filePath) => {
  const params = {
    Bucket: "videos",
    Key: filePath,
  };
  try {
    const command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // ลิงก์หมดอายุใน 1 ชั่วโมง
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
};

//Error deleting file: Error: Empty value provided for input HTTP label: Key
export const deleteImageFromAws = async (path, filePath) => {
  if (!path || !filePath) {
    console.error("Error: Bucket name or file path is missing.");
    throw new Error("Bucket name or file path is missing.");
  }
  const params = {
    Bucket: path, // ชื่อ Bucket
    Key: filePath, // Path และชื่อไฟล์ เช่น "images/your-image-name.png"
  };

  try {
    const command = new DeleteObjectCommand(params);
    const result = await s3Client.send(command);
    console.log("File deleted successfully:", result);
    return { success: true, message: "File deleted successfully." };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Error deleting file from DigitalOcean Spaces.");
  }
};
