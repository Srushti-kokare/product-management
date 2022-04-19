const validator = require('../validations/validator')
const aws = require('../aws/aws')
const userModel = require('../models/userModel')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

//**********************************  create user  *****************************************************************

const createUser = async (req, res) => {
    try {
        let data = req.body
        let files = req.files
        let { fname, lname, email, password, phone, address } = data

        if (!validator.isValidDetails(data)) {
            return res.status(400).send({ status: false, message: "please provide user data" })
        }
    
         if (!validator.isValidValue(fname)) {
            return res.status(400).send({ status: false, messege: "please provide name" })
        }
        if (!validator.isValidValue(lname)) {
            return res.status(400).send({ status: false, messege: "please provide lname" })
        }
    
        if (!validator.isValidValue(email)) {
            return res.status(400).send({ status: false, messege: "please provide email" })
        }
    
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            return res.status(400).send({ status: false, message: "Please provide valid Email Address" });
        }
    
        let isDuplicateEmail = await userModel.findOne({ email })
        if (isDuplicateEmail) {
            return res.status(400).send({ status: false, message: "email already exists" })
        }
    
        if (!validator.isValidValue(password)) {
            return res.status(400).send({ status: false, messege: "please provide password" })
        }
    
        if (password.length < 8 || password.length > 15) {
            return res.status(400).send({ status: false, message: "Password must be of 8-15 letters." })
        }
    
          if (!validator.isValidValue(phone)) {
            return res.status(400).send({ status: false, messege: "please provide phone number" })
        }
    
        let isValidPhone = (/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone))
        if (!isValidPhone) {
            return res.status(400).send({ status: false, message: "please provide valid phone number" })
        }
    
        let isDuplicatePhone = await userModel.findOne({ phone })
        if (isDuplicatePhone) {
            return res.status(400).send({ status: false, message: "phone no. already exists" })
        }

            if(address.shipping){
                if(!validator.isValidValue(address.shipping.street)){
                    return res.status(400).send({ status: false, messege: "please provide street for shipping." })
                }
                else if (!validator.isValidValue(address.shipping.city)){
                        return res.status(400).send({ status: false, messege: "please provide city for shipping." })
                    }
                    else if (!validator.isValidValue(address.shipping.pincode)){
                        return res.status(400).send({ status: false, messege: "please provide pincode for shipping." })
                    }
                    if (address.shipping.pincode.length != 6){
                        return res.status(400).send({status:false, message:"please provide valid pincode"})
                    }
            }
            else{
                return res.status(400).send({status:false, message:"please provide shipping details."})
            }

            if(address.billing){
                if(!validator.isValidValue(address.billing.street)){
                    return res.status(400).send({ status: false, messege: "please provide street for billing." })
                }
                else if (!validator.isValidValue(address.billing.city)){
                        return res.status(400).send({ status: false, messege: "please provide city for billing." })
                    }
                    else if (!validator.isValidValue(address.billing.pincode)){
                        return res.status(400).send({ status: false, messege: "please provide pincode for billing." })
                    }
                    if (address.billing.pincode.length != 6){
                        return res.status(400).send({status:false, message:"please provide valid pincode"})
                    }
            }
            else{
                return res.status(400).send({status:false, message:"please provide billing details."})
            }
        
        const salt = await bcrypt.genSalt(10);
        password = await bcrypt.hash(password, salt)

        if (!(files && files.length > 0)) {
            return res.status(400).send({ status: false, message: "Please provide your image" })
        }
        profileImage = await aws.uploadFile(files[0])

        const finalDetails = { fname, lname, email, profileImage, password, phone, address }
        let savedData = await userModel.create(finalDetails)
        return res.status(201).send({ status: true, msg: "user created successfully", data: savedData });
    }
    catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}

//**********************************  user login  ******************************************************************************************** */

const userLogin = async (req, res) => {
    try {
        const data = req.body
        let {email, password} = data

        if (!validator.isValidDetails(data)) {
            return res.status(400).send({ status: false, message: "please provide user credentials." })
        }

        if (!validator.isValidValue(email)) {
            return res.status(400).send({ status: false, message: "Email-Id is required" })
        }

        if (!(/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(email))) {
            return res.status(400).send({ status: false, message: "Email should be a valid email address" })
        }

        if (!validator.isValidValue(password)) {
            return res.status(400).send({ status: false, message: "Password is required" })
        }

        let findUser = await userModel.findOne({email});
        
        if (!findUser)
            return res.status(404).send({
                status: false,
                msg: "Login failed! No user found with the provided email.",
        });

       const isValidPassword = await bcrypt.compare(password, findUser.password)

       if (!isValidPassword)
            return res.status(404).send({
                status: false,
                msg: "Login failed! Wrong password.",
        });

            let token = jwt.sign(
                {
                  userId: findUser._id,
                  iat: Math.floor(Date.now() / 1000),
                  exp: Math.floor(Date.now() / 1000) + 60 * 60
                }, "group9");
        
        res.header('Authorization', token);
        return res.status(200).send({ status: true, message: "User login successfull", data:{usedId:`${findUser._id}`, token: token }})
    }
    catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}


/**********************************  get user detail  ******************************************************************************************** */

const getUserDetail = async function (req, res) {
    try {
        const userIdFromParams = req.params.userId;
        const userIdFromToken = req.userId
        
        const userByuserId = await userModel.findById(userIdFromParams).lean();

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }

        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({
              status: false,
              message: "Unauthorized access.",
            });
        }

        return res.status(200).send({ status: true, message: "User details", data: userByuserId });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//**********************************  update user details ******************************************************************************************** */

const updateUser = async (req, res) => {
    try {
        const userIdFromParams = req.params.userId
        const userIdFromToken = req.userId
    
        const dataFromBody = req.body

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

        if (!validator.isValidDetails(dataFromBody)) {
            return res.status(400).send({ status: false, msg: "please provide details to update." });
        }

        const { fname, lname, email, phone, password, address} = dataFromBody;

        if(fname){
            if (!validator.isValidValue(fname)) {
                return res.status(400).send({ status: false, msg: "Please provide first name of the user." });
            }
        }

        if(lname){
            if (!validator.isValidValue(lname)) {
                return res.status(400).send({ status: false, msg: "Please provide last name of the user." });
            }
        }

        if(email){
            if (!validator.isValidValue(email)) {
                return res.status(400).send({ status: false, msg: "Please provide email of the user." });
            }
    
            if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
                return res.status(400).send({ status: false, message: "Please provide valid Email Address" });
            }
    
            const isDuplicateemail = await userModel.findOne({ email: email });
            if (isDuplicateemail) {
                return res.status(400).send({status: false,msg: "User with provided email is already present.",})
            }
        }

        if(phone){
            if (!validator.isValidValue(phone)) {
                return res.status(400).send({ status: false, msg: "Please provide phone number of the user." });
            }
    
            let isValidPhone = (/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone))
            if (!isValidPhone) {
                return res.status(400).send({ status: false, message: "please provide valid phone number" })
            }
    
            const isDuplicatePhone = await userModel.findOne({ phone: phone });
            if (isDuplicatePhone) {
                return res.status(400).send({status: false,msg: "User with provided phone no. is already present.",})
            }
        }

        let holdPassword = password
        if(password){
            if (!validator.isValidValue(holdPassword)) {
                return res.status(400).send({ status: false, msg: "Please provide password." });
            }
    
            if (holdPassword.length < 8 || holdPassword.length > 15) {
                return res.status(400).send({ status: false, message: "Password must be of 8-15 letters." })
            }

            const salt = await bcrypt.genSalt(10);
            var hashedPassword = await bcrypt.hash(holdPassword, salt)
        }

        let files = req.files
        if(files && files.length > 0){
        var profileImageLink = await aws.uploadFile(files[0])
        } 
    
        let updatedDetails = await userModel.findOneAndUpdate(
            { _id: userIdFromParams }, 
            {$set: {
                fname: fname,
                lname: lname,
                email: email,
                profileImage: profileImageLink,
                phone: phone,
                password: hashedPassword
            }
        }, { new: true })

        res.status(200).send({
            status: true,
            msg: "user details updated successfully",
            data: updatedDetails,
        }); 
    }
    catch (error) {
        return res.status(500).json({ status: false, msg: error.message });
    }
}

module.exports = {
    createUser,
    userLogin,
    getUserDetail,
    updateUser
}