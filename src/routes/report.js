import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { reportAdmin } from '../controllers/report.js'
const router = express.Router()

router.post('/header', authenticationToken, reportAdmin)

export default router