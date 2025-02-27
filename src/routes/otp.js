import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { AddNewOtp, checkOtp, getOtp } from '../controllers/otp.js'
const routes = express.Router()

routes.post('/add', AddNewOtp)
routes.post('/check', checkOtp)
routes.get('/',getOtp)

export default routes