import express from "express";
import {
  creditCardCheckOrderByid,
  creditCardCheckout,
} from "../controllers/payment.js";
import { authenticationToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/creditcard/checkout", authenticationToken , creditCardCheckout);
router.get("/creditcard/order/:code", authenticationToken , creditCardCheckOrderByid);




export default router;
