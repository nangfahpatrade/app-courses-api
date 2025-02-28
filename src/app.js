import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";


// Import Router
import userRoute from "./routes/users.js";
import registerRoute from "./routes/register.js";
import loginRouter from "./routes/login.js";
import adminRouter from "./routes/admin.js";
import categoryRouter from "./routes/category.js";
import productRouter from "./routes/products.js";
import payRouter from "./routes/pay.js";
import questionRouter from "./routes/question.js";
import reviewsRouter from "./routes/reviews.js";
import activityRouter from "./routes/activity.js";
import ebookRouter from "./routes/ebook.js";
import otpRouter from "./routes/otp.js";
import homePageRouter from "./routes/homepage.js";
import reportRouter from "./routes/report.js";
import logoutRouter from "./routes/logout.js";
import paymentRouter from "./routes/payment.js";
// import { stripeHookCheck } from "./controllers/stripe/hook.js";


const app = express();

// Webhook Route ห้ามย้ายตำแหน่ง
// app.post('/api/webhook', express.raw({ type: "application/json" }),stripeHookCheck )

app.use(cors({
  origin: ["http://localhost:5173", "https://octopus-app-bwcrg.ondigitalocean.app"],
  methods: "GET, POST, PUT, DELETE, OPTIONS",
  allowedHeaders: "Content-Type, Authorization" , 
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("v1ss");
});

// เกี่ยวกับ code นี้ใน vps ไหม
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ใช้ express.static เพื่อให้บริการไฟล์ในโฟลเดอร์ 'public'
// app.use(express.static(path.join(__dirname, '../public')));

// Routers
app.use("/api/users", userRoute);
app.use("/api/register", registerRoute);
app.use("/api/login", loginRouter);
app.use("/api/admin", adminRouter);
app.use("/api/category", categoryRouter);
app.use("/api/product", productRouter);
app.use("/api/pay", payRouter);
app.use("/api/question", questionRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/ebook", ebookRouter);
app.use("/api/otp", otpRouter);
app.use("/api/homepage", homePageRouter);
app.use("/api/report", reportRouter);
app.use("/api/logout", logoutRouter);
app.use("/api/payment", paymentRouter);

export default app;
