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
        const {cartId, cancellable, status} = data

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
            return res.status(400).send({status:false, message:"Your cart is empty, please add product to place order."})
        }

        if(cancellable){
            if(typeof(cancellable != 'boolean')){
                return res.status(400).send({status:false, message:"cancellable should be a valid boolean value."})
            }
        }

        if(status){
            if(!validator.isValidStatus(status)){
                return res.status(400).send({status:false, message:"valid status is required. [completed, pending, cancelled]"})
            }
        }

        let totalQuantityInCart = 0 
        for(let i=0; i<findUserCart.items.length; i++){
            totalQuantityInCart += findUserCart.items[i].quantity
        }

        const newOrder = {
            userId : userIdFromParams,
            items : findUserCart.items,
            totalPrice : findUserCart.totalPrice,
            totalItems : findUserCart.totalItems,
            totalQuantity : totalQuantityInCart,
            cancellable,
            status
        }

        await cartModel.findOneAndUpdate({ _id: cartId}, {
            $set: {
                items: [],
                totalPrice: 0,
                totalItems: 0,
            }},{new:true});

        let saveOrder= await orderModel.create(newOrder)
        return res.status(201).send({status:true, message:"Order placed successfully", data:saveOrder})
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

        if(!validator.isValidStatus(status)){
            return res.status(400).send({status:false, message:"valid status is required. [completed, pending, cancelled]"})
        }

        if(status === 'pending'){
            if(findOrder.status === 'completed'){
                return res.status(400).send({status:false,
                    message:"Order can not be updated to pending. because it is completed."})
            }

            if(findOrder.status === 'cancelled'){
                return res.status(400).send({status:false,
                    message:"Order can not be updated to pending. because it is cancelled."})
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

            if(findOrder.status === 'completed'){
                return res.status(400).send({status:false,
                    message:"order is already completed."})
            }

            const orderStatus = await orderModel.findOneAndUpdate({ _id: orderId}, {
                $set: {
                    items: [],
                    totalPrice: 0,
                    totalItems: 0,
                    totalQuantity: 0,
                    status
                }},{new:true});

                return res.status(200).send({status: true,
                    message: "order completed successfully", data:orderStatus})
        }

        if(status === 'cancelled'){
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
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { createOrder, updateOrder }


