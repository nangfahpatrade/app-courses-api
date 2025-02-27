import express from 'express'
import { getAllCategory, getAllUsers, getMyProduct, getMyProductById, getVideoById } from '../controllers/users.js'
import { authenticationToken } from '../middleware/auth.js'
import { checkCoursesTimeOut } from '../libs/checkCoursesTimeOut.js'

const router = express.Router()

router.get('/', getAllUsers)
router.post('/category', authenticationToken , getAllCategory)

// User 
router.post('/product', authenticationToken, checkCoursesTimeOut , getMyProduct)
router.get('/product/:id', authenticationToken, getMyProductById)
router.get('/product/video/:id', authenticationToken, getVideoById)

export default router