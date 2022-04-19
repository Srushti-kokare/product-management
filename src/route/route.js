const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const productController = require("../controllers/productController")
const cartController = require("../controllers/cartController")
const orderController=require("../controllers/orderController")
const auth = require('../middleware/auth')

//------------------API's-----------------------------------------------------------------------------------

router.post('/register', userController.createUser)
router.post('/login', userController.userLogin)
router.get('/user/:userId/profile', auth.userAuth, userController.getUserDetail)
router.put('/user/:userId/profile', auth.userAuth, userController.updateUser)

router.post('/products', productController.createProduct)
router.get('/products', productController.filterProducts)
router.get('/products/:productId', productController.getProductById)
router.put('/products/:productId', productController.updateProduct)
router.delete('/products/:productId', productController.deleteProduct)

router.post('/users/:userId/cart', auth.userAuth, cartController.createCart)
router.put('/users/:userId/cart', auth.userAuth,cartController.updateCart)
router.get('/users/:userId/cart', auth.userAuth,cartController.getCartDetails)
router.delete('/users/:userId/cart', auth.userAuth, cartController.deleteCart)

router.post('/users/:userId/orders',auth.userAuth, orderController.createOrder)
router.put('/users/:userId/orders',auth.userAuth, orderController.updateOrder)
module.exports = router;