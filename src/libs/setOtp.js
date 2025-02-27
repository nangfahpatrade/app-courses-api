import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const sendNewMail = async(userEmail, otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,  
              pass: process.env.EMAIL_PASS,  
            },
          });
    
        // ตั้งค่าอีเมลที่จะส่ง
        const mailOptions = {
          from: process.env.EMAIL_USER, // อีเมลที่คุณใช้
          to: userEmail, // อีเมลของผู้รับ
          subject: "ยืนยัน OTP บริษัท abc001 จำกัด",
          text: `Here is your OTP code: ${otp}`,
    
        };
    
        // ส่งอีเมล
        // transporter.sendMail(mailOptions, (error, info) => {
        //   if (error) {
        //     console.log("Error sending email:", error);
        //     return res.status(500).send("Error sending OTP");
        //   }
        //   console.log("Email sent: " + info.response);
        //   res.status(200).send("OTP sent");
        // });
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return "OK"; // ส่ง response กลับไปยังผู้เรียกใช้งาน

    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // ส่ง error ต่อไปยังผู้เรียกใช้งาน
    }
}

