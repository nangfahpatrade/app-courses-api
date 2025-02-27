import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { deleteActivityById, getActivityByid, getActivityImageList, getAllActivity, postNewActivity, putActivity, uploadMiddleware } from '../controllers/activity.js'
const router = express.Router()

router.post('/add', authenticationToken, uploadMiddleware ,postNewActivity )
router.post('/', authenticationToken ,getAllActivity  )
router.get('/:id', authenticationToken ,getActivityByid  )
router.delete('/:id', authenticationToken ,deleteActivityById  )
router.put('/', authenticationToken ,uploadMiddleware,putActivity  )
router.get('/images/:activity_id', authenticationToken ,getActivityImageList  )


export default router