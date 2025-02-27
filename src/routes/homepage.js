import express from 'express'
import { getCategory, getEbook, getNewCourses, getNewCoursesById, getNews, getNewsById, getReviews, getReviewsById, showTop4 } from '../controllers/homepage.js'
const router = express.Router()

router.post('/courses', getNewCourses)
router.get('/courses/:id', getNewCoursesById)

router.post('/news', getNews)
router.get('/news/:id', getNewsById)
// Category
router.get('/category', getCategory)
// Ebook
router.post('/ebook', getEbook)
// Reviews
router.post('/reviews',getReviews)
router.get('/reviews/:id', getReviewsById)

// Top-4
router.post('/top_4', showTop4)



export default router