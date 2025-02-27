import express from 'express'
import { deleteAdmin, editAdminById, getAdminById, getAllAdmin } from '../controllers/admin.js'
import { authenticationToken } from '../middleware/auth.js'

const router = express.Router()

router.delete('/:id', deleteAdmin)
router.post('/', authenticationToken , getAllAdmin)
router.post('/by_id', authenticationToken , getAdminById)
router.put('/', authenticationToken, editAdminById)


export default router