const cartModel = require('../models/cartModel')
const userModel = require('../models/userModel')
const orderModel = require('../models/orderModel')
const validator = require('../validations/validator')

//------------------------------- create order ----------------------------------------------------------------------

const createOrder = async (req, res) => {
    try{
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
        const data = req.body
        const {cartId, totalPrice, totalQuantity, cancellable, status} = data

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

        const findUserCart = await cartModel.findById(cartId);

        if(!findUserCart){
            return res.status(404).send({status:false, message:"user's cart not found."})
        }

        if(findUserCart.items.length === 0){
            return res.status(400).send({status:false, message:"User cart is empty."})
        }

        if (!validator.isValidValue(totalPrice)) {
            return res.status(400).send({ status: false, messege: "please provide totalPrice" })
        }

        if(totalPrice <= 0){
            return res.status(400).send({status:false, message:"total price can not be equalto or less than zero."})
        }

        if(totalPrice != findUserCart.totalPrice){
            return res.status(400).send({status:false,
                message:"Total price should be equal to the total price of products in the cart."})
        }

        if (!validator.isValidValue(totalQuantity)) {
            return res.status(400).send({ status: false, messege: "please provide totalQuantity" })
        }   

        if(totalQuantity <= 0){
            return res.status(400).send({status:false, message:"total Quantity can not be equalto or less than zero."})
        }

        let totalQuantityInCart = 0 
        for(let i=0; i<findUserCart.items.length; i++){
            totalQuantityInCart += findUserCart.items[i].quantity
        }

        if(totalQuantity != totalQuantityInCart){
            return res.status(400).send({status:false,
                message:"Total quantity should be equal to the total quantity of products in the cart."})
        }

        if(cancellable){
            if((cancellable != true) && (cancellable != false)){
                return res.status(400).send({status:false, message:"cancellable should be a valid boolean value."})
            }
        }

        if(status){
            if(!validator.isValidStatus(status)){
                return res.status(400).send({status:false, message:"valid status is required. [completed, pending, cancelled]"})
            }
        }

        const newOrder = {
            userId : userIdFromParams,
            items : findUserCart.items,
            totalPrice : totalPrice,
            totalItems : findUserCart.totalItems,
            totalQuantity : totalQuantity,
            cancellable : cancellable,
            status : status
        }

        await cartModel.findOneAndUpdate({ _id: cartId}, {
            $set: {
                items: [],
                totalPrice: 0,
                totalItems: 0,
            },
        });

        const saveOrder= await orderModel.create(newOrder)
        return res.status(201).send({status:true, message:"Order saved successfully", data:saveOrder})
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

//------------------------------- update order ----------------------------------------------------------------------


const updateOrder = async (req, res) => {
    try{
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
        const data = req.body
        const {orderId, status} = data

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

        if (!validator.isValidValue(orderId)) {
            return res.status(400).send({ status: false, messege: "please provide OrderId" })
        }

        if (!validator.isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findOrder = await orderModel.findById(orderId);
        
        if (!findOrder) {
            return res.status(400).send({ status: false, message: 'Order Id is incorrect.' });
        }

        if (findOrder.totalPrice === 0) {
            return res.status(404).send({ status: false, message: 'No order has been placed' });
        }

        if(!validator.isValidStatus(status)){
            return res.status(400).send({status:false, message:"valid status is required. [completed, pending, cancelled]"})
        }

        if(status === 'pending'){
            if(findOrder.status === 'completed'){
                return res.status(400).send({status:false,
                    message:"Order can not be updated to pending. because it is completed."})
            }

            if(findOrder.status === 'pending'){
                return res.status(400).send({status:false,
                    message:"order is already pending."})
            }
        }

        if(status === 'completed'){
            if(findOrder.status === 'cancelled'){
                return res.status(400).send({status:false,
                    message:"Order can not be updated to completed. because it is cancelled."})
            }

            if(findOrder.status === 'complted'){
                return res.status(400).send({status:false,
                    message:"order is already completed."})
            }
        }

        if(status === 'cancelled'){
            console.log("coming in")
            if(findOrder.cancellable == false){
                return res.status(400).send({status:false,
                    message:"Item can not be cancelled, because it is not cancellable."})
            }

            if(findOrder.status === 'cancelled'){
                return res.status(400).send({status:false,
                    message:"order already cancelled."})
            }

            const findOrderAfterDeletion = await orderModel.findOneAndUpdate(
                { userId: userIdFromParams },
                {$set: {
                    items: [],
                    totalPrice: 0,
                    totalItems: 0,
                    totalQuantity : 0,
                    status : 'cancelled'
                }
            },{new:true})
            
            return res.status(200).send({status: true,
                message: "order cancelled successfully", data:findOrderAfterDeletion})
        }

        let totalQuantityInCart = 0 
        for(let i=0; i<findOrder.items.length; i++){
            totalQuantityInCart += findOrder.items[i].quantity
        }

        const newOrder = {
            userId : userIdFromParams,
            items : findOrder.items,
            totalPrice : findOrder.totalPrice,
            totalItems : findOrder.totalItems,
            totalQuantity : findOrder.totalQuantity,
            cancellable : findOrder.cancellable,
            status : status
        }

        const updateOrder = await orderModel.findOneAndUpdate(
            { userId: userIdFromParams },
            newOrder,
            {new:true})

            return res.status(200).send({status: true,
                message: "order status updates successfully", data:updateOrder})
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { createOrder, updateOrder }


