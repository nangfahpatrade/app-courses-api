import crypto  from 'crypto'

// ฟังก์ชันสร้างลิงก์ชั่วคราว
export async function createTemporaryUrl(videoId) {
    const baseUrl = 'http://203.146.252.205/videos/';
    const expiresIn = 300; // ลิงก์จะหมดอายุใน 300 วินาที (5 นาที)
    
    // สร้าง token สำหรับยืนยัน
    const token = crypto.randomBytes(20).toString('hex');
    
    // ลิงก์ที่พร้อมใช้งาน
    return `${baseUrl}${videoId}?token=${token}&expires=${Date.now() + expiresIn * 1000}`;
  }
  
//   // ฟังก์ชันตรวจสอบ token ใน express API (เพื่อให้แน่ใจว่าลิงก์ยังใช้ได้)
//   app.get('/ftp/videos/:videoId', (req, res) => {
//     const { videoId } = req.params;
//     const { token, expires } = req.query;
  
//     // ตรวจสอบว่าเวลาหมดอายุหรือยัง
//     if (Date.now() > expires) {
//       return res.status(403).json({ error: 'Link expired' });
//     }
  
//     // ตรวจสอบ token (สามารถเก็บ token ใน database หรือ memory เพื่อเทียบเคียง)
//     if (!isValidToken(token)) {
//       return res.status(403).json({ error: 'Invalid token' });
//     }
  
//     // ส่งลิงก์วิดีโอให้ผู้ใช้เล่น
//     const videoPath = `/path/to/ftp/videos/${videoId}.mp4`;
//     res.sendFile(videoPath);
//   });