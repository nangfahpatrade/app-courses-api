import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { getAllUserLogin, logout } from '../controllers/logout.js'
const router = express.Router()

router.post('/', logout)
router.post('/all', authenticationToken, getAllUserLogin)

export default router