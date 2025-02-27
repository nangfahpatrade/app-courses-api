import express from 'express'
import { getMyUserData, loginUser, loginUserOtp, putMyUserData } from '../controllers/login.js'
import { authenticationToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/', loginUser)
router.post('/otp', loginUserOtp)

// User data
router.get('/user/:id', authenticationToken, getMyUserData)
router.put('/user', authenticationToken, putMyUserData)

export default router