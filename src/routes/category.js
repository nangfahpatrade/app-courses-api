import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { addNewCategory, deleteCategory, editCategory, getAllCategory, getCategoryById } from '../controllers/category.js'

const router = express.Router()

router.post('/', authenticationToken, getAllCategory)
router.post('/add', authenticationToken, addNewCategory)
router.get('/:id', authenticationToken, getCategoryById)
router.delete('/:id', authenticationToken, deleteCategory)
router.put('/', authenticationToken, editCategory)

export default router