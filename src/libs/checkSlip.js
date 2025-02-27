import axios from "axios";
import { Blob } from "buffer";
import slipOK from "slipok";

import dotenv from "dotenv";
dotenv.config();

// ฟังก์ชันตรวจสอบสลิป, ยอดเงิน, และบัญชีที่โอนมา
export async function verifySlipAmountAndAccount(slipBuffer, expectedAmount) {
  try {

    const expectedAccountNumber = process.env.SLIP_OK_ACCOUNT_NUMBER; 
    const expectedAccountName = process.env.SLIP_OK_ACCOUNT_NAME; 

    const formData = new FormData();
    const blob = new Blob([slipBuffer], { type: "image/jpeg" });
    formData.append("files", blob, "slip.jpg");

    const response = await axios.post(
      `https://api.slipok.com/api/line/apikey/${process.env.SLIP_OK_BRANCH_ID}`, 
      formData,
      {
        headers: {
          "x-authorization": process.env.SLIP_OK_API_KEY,
        },
      }
    );

    const success = response.data.success;
    const success_qrcode = response.data.data.success;
    const amount = response.data.data.amount;
    const sendToname = response.data.data.receiver.name;
    const sendToAccount = response.data.data.receiver.account.value;
    const transRef = response.data.data.transRef

    // console.log(response.data);

    console.log("************");

    console.log({amount, sendToname, sendToAccount});
    
    // console.log({transRef});
    console.log("************");

    // console.log({expectedAmount, expectedAccountName , expectedAccountNumber });
    
    
    // return {status : true, transRef };

    // ตรวจสอบว่าการตรวจสอบสลิปสำเร็จ, ยอดเงินถูกต้อง, และบัญชีปลายทางถูกต้องหรือไม่
      if ( amount == expectedAmount && sendToname == expectedAccountName &&  sendToAccount == expectedAccountNumber  ) {        
        
        return {status : true, transRef };
      } else {
        return {status : false, transRef };
      }
  } catch (error) {
    console.error("Error verifying slip:", error);
    return false;
  }
}
