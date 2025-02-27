import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { checkUserPay, createQrCode, getAllPay, getPayMyUser, payNewCourses, updateCheckSlip, uploadMiddleware } from '../controllers/pay.js'
const router = express.Router()

router.post('/', authenticationToken, getAllPay)
router.post('/add', authenticationToken, payNewCourses)
router.post('/upload_slip', authenticationToken, uploadMiddleware, updateCheckSlip )
// User
router.post('/users', authenticationToken, getPayMyUser)
router.post('/users/check_pay', authenticationToken, checkUserPay)

// QR Code
router.post('/users/qr_code/create', authenticationToken, createQrCode )



export default router