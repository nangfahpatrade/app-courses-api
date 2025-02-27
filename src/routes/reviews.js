import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { deleteReviewsById, getReviewImageList, getReviewsByid, postALlReviews, postNewReviews, putReviews, uploadMiddleware } from '../controllers/reviews.js'
const router = express.Router()

router.post('/add', authenticationToken, uploadMiddleware, postNewReviews  )
router.post('/', authenticationToken, postALlReviews  )
router.get('/images/:reviews_id', authenticationToken, getReviewImageList  )
router.get('/:id', authenticationToken, getReviewsByid  )
router.delete('/:id', authenticationToken, deleteReviewsById  )
router.put('/', authenticationToken, uploadMiddleware, putReviews  )

export default router