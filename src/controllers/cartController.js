const cartModel = require('../models/cartModel')
const productModel = require('../models/productModel')
const userModel = require('../models/userModel')
const validator = require('../validations/validator')

//------------------------------- create cart ----------------------------------------------------------------------

const createCart = async (req, res) => {
    try{
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
        const data = req.body
        const {productId, quantity} = data

        if (!validator.isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }

        const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }

        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        if (!validator.isValidValue(productId)) {
            return res.status(400).send({ status: false, messege: "please provide productId" })
        }

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById(productId);

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product not found.' });
        }

        if(findProduct.isDeleted == true){
            return res.status(400).send({ status:false, msg: "product is deleted" });
        }

        if (!validator.isValidValue(quantity)) {
            return res.status(400).send({ status: false, messege: "please provide quantity" })
        }

        if ((isNaN(Number(quantity)))) {
            return res.status(400).send({status:false, message: 'quantity should be a valid number' })         //price should be valid number
        }

        if (quantity < 0) {
            return res.status(400).send({status:false, message: 'quantity can not be less than zero' })    //price should be valid number
        }

        const isOldUser = await cartModel.findOne({userId : userIdFromParams});

        if(!isOldUser){
            const newCart = {
                userId : userIdFromParams,
                items : [{
                    productId : productId,
                    quantity : quantity
                }],
                totalPrice : (findProduct.price)*quantity,
                totalItems : 1
            }

            const saveCart = await cartModel.create(newCart)
            return res.status(201).send({status:true, message:"cart created successfully", data:saveCart})
        }

        if(isOldUser){
            const newTotalPrice = (isOldUser.totalPrice) + ((findProduct.price)*quantity)
            let flag = 0;  //this for same user for adding the products
            const items = isOldUser.items
            for(let i=0; i<items.length; i++){
                if(items[i].productId.toString() === productId){
                    console.log("productIds are similar")
                    items[i].quantity += quantity
                    var newCartData = {
                        items : items,
                        totalPrice : newTotalPrice,
                        quantity : items[i].quantity
                    }
                    flag = 1;  // new user adding products
                    const saveData = await cartModel.findOneAndUpdate(
                        {userId : userIdFromParams},
                        newCartData, {new:true})
                    return res.status(201).send({status:true, 
                        message:"product added to the cart successfully", data:saveData})
                }
            }
            if (flag === 0){
                console.log("productIds are not similar")
                let addItems = {
                    productId : productId,
                    quantity : quantity
                 }
                const saveData = await cartModel.findOneAndUpdate(
                {userId : userIdFromParams},
                {$addToSet : {items : addItems}, $inc : {totalItems : 1, totalPrice: ((findProduct.price)*quantity)}},
                {new:true, upsert:true})
                return res.status(201).send({status:true, message:"product added to the cart successfully", data:saveData})
            }
        }
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}
//------------------------------------- update cart ---------------------------------------------------------------

const updateCart = async (req, res) => {
    try{
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
        const data = req.body
        const {productId, cartId, removeProduct} = data

        if (!validator.isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }

        const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }
        
        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        if (!validator.isValidValue(productId)) {
            return res.status(400).send({ status: false, messege: "please provide productId" })
        }

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById(productId);
        
        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product not found.' });
        }

        if(findProduct.isDeleted == true){
            return res.status(400).send({ status:false, msg: "product is deleted" });
        }

        if (!validator.isValidValue(cartId)) {
            return res.status(400).send({ status: false, messege: "please provide cartId" })
        }

        if (!validator.isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, msg: "cartId is invalid" });
        }

        const findCart = await cartModel.findById(cartId);
    
        if (!findCart) {
            return res.status(404).send({ status: false, message: 'cart not found.' });
        }

        const findProductInCart = await cartModel.findOne({ items: { $elemMatch: { productId: productId } } });
       
        if (!findProductInCart) {
            return res.status(404).send({ status: false, message: 'product not found in the cart.' });
        }

        if (!validator.isValidValue(removeProduct)) {
            return res.status(400).send({ status: false, messege: "please provide items to delete" })
        }

        if ((isNaN(Number(removeProduct)))) {
            return res.status(400).send({ status: false, message:'removeProduct should be a valid number' })
        }
        
        if ((removeProduct != 0) && (removeProduct != 1)) {
            return res.status(400).send({ status: false, message: 'removeProduct should be 0 or 1' })
        }
        let findQuantity = findCart.items.find(x => x.productId.toString() === productId)
        
        if (removeProduct == 0) {
            let totalAmount = findCart.totalPrice - (findProduct.price * findQuantity.quantity)
            let quantity = findCart.totalItems - 1
            let newCart = await cartModel.findOneAndUpdate(
                { _id: cartId },
                { $pull: { items: { productId: productId } },
                $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true })

            return res.status(200).send({ status: true,
                message: 'the product has been removed from the cart', data: newCart })
        }

        if(removeProduct == 1){
            console.log("coming in")
        let totalAmount = findCart.totalPrice - findProduct.price
        let items = findCart.items
            for(let i=0; i<items.length; i++){
                if(items[i].productId.toString() === productId){
                    items[i].quantity = items[i].quantity - 1
                    if (items[i].quantity == 0) {
                        console.log("quantity has become 0 now.")
                        var noOfItems = findCart.totalItems - 1
                        let newCart = await cartModel.findOneAndUpdate(
                            { _id: cartId },
                            { $pull: { items: { productId: productId } },
                            $set: { totalPrice: totalAmount, totalItems: noOfItems } }, { new: true })
                        return res.status(200).send({ status:true,
                        message:'the product has been removed from the cart', data: newCart })
                       }
                }
            }

           console.log("quantity is not 0.")
        let data = await cartModel.findOneAndUpdate(
            { _id: cartId },
            {totalPrice: totalAmount, items: items}, { new: true })

           return res.status(200).send({ status:true,
            message:'product in the cart updated successfully.', data: data })
        
        }
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}
//--------------------------------------- get cart details ------------------------------------------------------------

const getCartDetails = async (req, res) => {
    try{
        let userIdFromParams = req.params.userId
        let userIdFromToken = req.userId

        if (!validator.isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }

        const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }

        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        const findCart = await cartModel.findOne({ userId: userIdFromParams })
        
        if (!findCart) {
            return res.status(400).send({ status: false, message: "no cart exist with this id" })
        }
        
        if(findCart.totalPrice === 0){
            return res.status(404).send({status:false, msg:"your cart is empty."})
        }

       return res.status(200).send({status:true, msg:"Cart Details.", data:findCart})
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

//--------------------------------------- delete cart ------------------------------------------------------------

const deleteCart = async (req, res) => {
    try {
        let userIdFromParams = req.params.userId
        let userIdFromToken = req.userId

        if (!validator.isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, msg: "userId is invalid" });
        }

        const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }

        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        const findCart = await cartModel.findOne({ userId: userIdFromParams })
        
        if (!findCart) {
            return res.status(400).send({ status: false, message: "no cart exist with this id" })
        }
        
        if(findCart.totalPrice === 0){
            return res.status(404).send({status:false, message:"your cart is empty."})
        }

        await cartModel.findOneAndUpdate(
            { userId: userIdFromParams },
            {$set: {
                items: [],
                totalPrice: 0,
                totalItems: 0
            }
        })
        const findCartAfterDeletion = await cartModel.findOne({ userId: userIdFromParams })
        
        return res.status(200).send({status: true,
            message: "All products have been removed from the cart successfully", data:findCartAfterDeletion})
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { createCart, updateCart, deleteCart, getCartDetails }

