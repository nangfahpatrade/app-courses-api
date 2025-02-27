import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { deleteEbook, getAllEbook, getEbookById, postNewEbook, putEbook, uploadMiddleware } from '../controllers/ebook.js'

const router = express.Router()

router.post('/add', authenticationToken, uploadMiddleware, postNewEbook)
router.post('/', authenticationToken, getAllEbook)
router.get('/:id', authenticationToken, getEbookById)
router.put('/', authenticationToken, uploadMiddleware, putEbook)
router.delete('/:id', authenticationToken , deleteEbook)


export default router