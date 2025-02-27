import express from 'express'
import { authenticationToken } from '../middleware/auth.js'
import { addNewProduct, addNewProductsVideos, addNewProductTitle, deleteProductById, deleteProductTitle, deleteProductVideoById, editProductByid, editProductsVideos, getAllProducts, getAllProductsTitle, getAllProductsVideos, getProductById, getProductsTitleById, getProductsVideosById, putProductsTitle, SendImageToAws, SendVideoToAws, ShowDataFromAws, upload_aws, upload_video_aws, uploadMiddleware, userGetVideo } from '../controllers/products.js'

const  routes = express.Router()

routes.post('/add', authenticationToken, uploadMiddleware, addNewProduct)
routes.post('/', authenticationToken , getAllProducts)

routes.get('/:id', authenticationToken, getProductById)
routes.delete('/:id', authenticationToken, deleteProductById)
routes.put('/', uploadMiddleware, authenticationToken , editProductByid)

// products_title
routes.post('/add/title', authenticationToken, addNewProductTitle)
routes.post('/title', authenticationToken, getAllProductsTitle)
routes.get('/title/:id' , authenticationToken, getProductsTitleById)
routes.put('/title', authenticationToken , putProductsTitle)
routes.delete('/title/:id', authenticationToken , deleteProductTitle)

// Products Videos
routes.post('/add/videos', authenticationToken, uploadMiddleware , addNewProductsVideos)
routes.post('/videos', authenticationToken, getAllProductsVideos)
routes.get('/videos/:id', authenticationToken, getProductsVideosById)
routes.put('/videos', authenticationToken, uploadMiddleware,  editProductsVideos)
routes.delete('/videos/:id' ,authenticationToken, deleteProductVideoById)

// User GET Videso
routes.post('/courses/test/', userGetVideo )
routes.get('/show/:id', authenticationToken, ShowDataFromAws)

routes.post('/test', upload_aws,  SendImageToAws )
routes.post('/test2', upload_video_aws,  SendVideoToAws )
routes.get('/test3/:path/:filePath',  ShowDataFromAws )

export default routes