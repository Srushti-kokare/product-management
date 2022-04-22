const productModel = require('../models/productModel')
const aws = require('../aws/aws')
const currencySymbol = require("currency-symbol-map")
const validator = require('../validations/validator')

//----------------------- create product ------------------------------------------------------------------------

const createProduct = async (req, res) => {
    try{
        let { title,description,price,currencyId,currencyFormat,
            availableSizes,isFreeShipping,installments,style } = req.body

            if (!validator.isValidDetails(req.body)) {
                return res.status(400).send({ status: false, message: "please provide product details" })
            }
        
            if (!validator.isValidValue(title)) {
                return res.status(400).send({ status: false, messege: "please provide title" })
            }
            let isDuplicateTitle = await productModel.findOne({ title })
            if (isDuplicateTitle) {
                return res.status(400).send({ status: false, message: "title already exists" })
            }
    
            if (!validator.isValidValue(description)) {
                return res.status(400).send({ status: false, messege: "please provide description" })
            }
    
            if (!validator.isValidValue(price)) {
                return res.status(400).send({ status: false, messege: "please provide price" })
            }
    
            if (!validator.isValidValue(currencyId)) {
                return res.status(400).send({ status: false, messege: "please provide currencyId" })
            }
    
            if (currencyId != "INR") {
                return res.status(400).send({ status: false, message: "currencyId should be INR" })
            }
    
            if(installments){
                if (installments <= 0 || installments % 1 != 0) {
                    return res.status(400).send({ status: false, message: "installments can not be a decimal number " })
                }
            }

            if (!validator.isValidValue(availableSizes)) {
                return res.status(400).send({ status: false, messege: "please provide availableSizes" })
            }

        currencyFormat = currencySymbol('INR') 
        
        let files = req.files
        if (!(files && files.length > 0)) {
            return res.status(400).send({ status: false, message: "Please provide product image" })
        }
        let productImage = await aws.uploadFile(files[0])

        let productData = { title,description,price,currencyId,currencyFormat,
            availableSizes,isFreeShipping,productImage,installments,style }

        let savedData = await productModel.create(productData)
        return res.status(201).send({ status: true, message: "new product created successfully", data: savedData });
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

//----------------------- filter products------------------------------------------------------------------------

const filterProducts = async (req, res) => {
    try{
        const queryData = req.query
        let filter = { isDeleted:false }

        const { size, name, priceGreaterThan, priceLessThan, sortPrice } = queryData;

        if(validator.isValidValue(size)){
            filter['availableSizes'] = size
        }

        if(validator.isValidValue(name)){  
            filter['title'] = {}
            filter['title']['$regex'] = name             //samsung galaxy user: GALAXY
            filter['title']['$options'] = '$i'                   //case insensitive
        }

        if(validator.isValidValue(priceGreaterThan)){
            if (!(!isNaN(Number(priceGreaterThan)))) {
                return res.status(400).send({status:false, message: 'price should be a valid number' })           //price should be valid number
            }
            if (priceGreaterThan <= 0) {
                return res.status(400).send({status:false, message: 'price can not be less than zero' })         //price should be valid number
            }
            if (!Object.prototype.hasOwnProperty.call(filter,'price'))                                         // checking if "price" exists
                filter['price'] = {}                                                     //creating empty object
                filter['price']['$gte'] = Number(priceGreaterThan)                      //using mongoose operator 
        }

        if(validator.isValidValue(priceLessThan)){
            if (!(!isNaN(Number(priceLessThan)))) {
                return res.status(400).send({status:false, message: 'price should be a valid number' })         //price should be valid number
            }
            if (priceLessThan <= 0) {
                return res.status(400).send({status:false, message: 'price can not be zero or less than zero' })    //price should be valid number
            }
            if (!Object.prototype.hasOwnProperty.call(filter,'price'))                                        // checking if "price" exists
                filter['price'] = {}                                                    //creating empty object
                filter['price']['$lte'] = Number(priceLessThan)                        //using mongoose operator 
        }

        if (validator.isValidValue(sortPrice)) {

            if (!((sortPrice == 1) || (sortPrice == -1))) {
                return res.status(400).send({ status: false, message: 'priceSort should be 1 or -1 '})
            }

            const products = await productModel.find(filter).sort({ price: sortPrice })

            if (products.length === 0) {
                return res.status(404).send({ productStatus: false, message: 'No Product found' })
            }

            return res.status(200).send({ status: true, message: 'Product list', data: products })
        }

        const products = await productModel.find(filter)

        if (products.length === 0) {
            return res.status(404).send({ productStatus: false, message: 'No Product found' })
        }

        return res.status(200).send({ status: true, message: 'Product list', data: products })
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

//----------------------- get product byId------------------------------------------------------------------------

const getProductById = async (req, res) => {
    try{
        const productId = req.params.productId

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById({_id:productId,isDeleted:false})

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product does not exists' })
        }

        return res.status(200).send({ status: true, message: 'Product found successfully', data: findProduct })
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

//----------------------- update product-------------------------------------------------------------------------------------------------------

const updateProduct = async function (req,res){
    try {
        const productId = req.params.productId

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }
       
        const findProduct = await productModel.findById(productId)

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product does not exists' })
        }

        if(findProduct.isDeleted == true){
            return res.status(400).send({ status:false, msg: "product is deleted" });
        }

        if (!validator.isValidDetails(req.body)) {
            return res.status(400).send({ status: false, msg: "please provide details to update." });
        }

        let { title, description, price, currencyId,
            productImage, style, isFreeShipping, availableSizes, installments } = req.body

        const dataToUpdate = {}


            if(validator.isValidValue(title)){
            const isDuplicateTitle = await productModel.findOne({title});
            if (isDuplicateTitle) {
                return res.status(400).send({status: false,msg: "title already exists.",})
            }
                if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))  //returns a boolean indicating whether the object has the 
                                                                                    //specified property as its own property 
                    dataToUpdate['$set']  ={} 
            dataToUpdate['$set']['title'] = title
        }
        

            if(validator.isValidValue(description)){
                if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
                    dataToUpdate['$set']  ={} 
            dataToUpdate['$set']['description'] = description
            }


            if(validator.isValidValue(price)){
            
            if (!(!isNaN(Number(price)))) {
                return res.status(400).send({ status: false, message: 'Price should be a valid number' })
            }

            if (price <= 0) {
                return res.status(400).send({ status: false, message: 'Price can not be zero or less than zero.' })
            }
            if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
            dataToUpdate['$set']  ={} 
            dataToUpdate['$set']['price'] = price
            dataToUpdate['price'] = price
        }

     
            if(validator.isValidValue(currencyId)){
             
            if (!(currencyId == "INR")) {
                return res.status(400).send({ status: false, message: 'currencyId should be a INR' })
            }
            if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
            dataToUpdate['$set']  ={} 
            dataToUpdate['$set']['currencyId'] = currencyId
            dataToUpdate['currencyId'] = currencyId
        }

        
        if(validator.isValidValue(isFreeShipping)){
            if(!((isFreeShipping==="true" )|| (isFreeShipping === "false"))){
                return res.status(400).send({status:false,message:"provide boolean values"})
            }
            if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
                dataToUpdate['$set']  ={} 
        dataToUpdate['$set']['isFreeShipping'] = isFreeShipping
        }

             
                productImage = req.files;
            if ((productImage && productImage.length > 0)) {
            let imageLink = await aws.uploadFile(productImage[0]);
            if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
            dataToUpdate['$set']  ={} 
            dataToUpdate['$set']['productImage'] = imageLink
        }

            if(validator.isValidValue(style)){
                if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
                dataToUpdate['$set']  ={} 
                dataToUpdate['$set']['style'] = style
            }
           

            if(validator.isValidValue(availableSizes)){
                let sizeEnum = availableSizes.split(",").map(x => x.trim())
            for (let i = 0; i < sizeEnum.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizeEnum[i]))) {
                    return res.status(400).send({status: false, message: 'Available Sizes must be ${["S", "XS", "M", "X", "L", "XXL", "XL"]}' })
                }
            }
            if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
            dataToUpdate['$set']  ={} 
            if(Array.isArray(array))
            dataToUpdate['$set']['availableSizes'] = {$each:array}
        }

       
            if(validator.isValidValue(installments)){
              if(!(!isNaN(Number(installments)))){
                return res.status(400).send({ status: false, message: "installments should be number " })
            }
           
            if(!Object.prototype.hasOwnProperty.call(dataToUpdate, '$set'))
            dataToUpdate['$set']  ={} 
            dataToUpdate['$set']['installments'] = installments
        }

        const updatedProduct = await productModel.findOneAndUpdate(
            { _id: productId }, dataToUpdate, {new: true} );

        res.status(200).send({
            status: true,
            message: "product details updated successfully",
            data: updatedProduct,
        });
    }
    catch (error) {
        return res.status(500).send({ status: false, message :error.message });
    }
}

//----------------------- delete product ------------------------------------------------------------------------

const deleteProduct = async (req, res) => {
    try{
        const productId = req.params.productId

        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, msg: "productId is invalid" });
        }

        const findProduct = await productModel.findById({_id:productId,isDeleted:false});

        if (!findProduct) {
            return res.status(404).send({ status: false, message: 'product not found' })
        }
        if (findProduct.isDeleted == true){
            return res.status(400).send({status:false, message:"product already deleted."})
        }
        const deletedDetails = await productModel.findOneAndUpdate(
            { _id: productId },
            { $set: { isDeleted: true, deletedAt: new Date() } }, {new:true})

        return res.status(200).send({ status: true, message: 'Product deleted successfully.', data:deletedDetails })
    }
    catch(error){
        return res.status(500).json({ status: false, message: error.message });
    }
}

module.exports = { createProduct, getProductById, deleteProduct, filterProducts, updateProduct }
