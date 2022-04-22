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
        let { fname, lname, email, password, phone } = data
        let addressStr=data.address
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

        if(!addressStr || Object.keys(addressStr).length==0){
            return res.status(400).send({status:false, message:"please provide address"})
        }
        const address =JSON.parse(addressStr)
        if(!address.shipping ||(address.shipping && (!address.shipping.street || !address.shipping.city || !address.shipping.pincode))){
            return res.status(400).send({status:false,message:"shipping address required"})
        } 
    if(!address.billing || (address.billing && (!address.billing.street || !address.billing.city || !address.billing.pincode))){
            return res.status(400).send({status:false,message:"please provide billing address"})
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
        return res.status(500).send({ status: false, message: error.message })
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
        return res.status(500).send({ status: false, message: error.message })
    }
}


/**********************************  get user detail  ******************************************************************************************** */

const getUserDetail = async function (req, res) {
    try {
        const userIdFromParams = req.params.userId;
        const userIdFromToken = req.userId
        
        if (!validator.isValidObjectId(userIdFromParams)) {
            return res.status(400).send({ status: false, message: "userId is invalid" });
        }
        
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
        let data = req.body
        const userIdFromToken = req.userId
        const id = req.params.userId
        let files = req.files

        if (files) {
              if (files && files.length > 0) {
                  var uploadedFileURL = await aws.uploadFile(files[0]) // File Uploaded Here
  
              }
          }
  
        
        if(!(data && files)){
            return res.status(400).send({status:false,message:"data doesnt exist"}) 
        }

        if (!validator.isValidDetails(data)) {
             return res.status(400).send({ status: false, message: "please provide details to update." });
                     }
        if (!validator.isValidObjectId(id)) {
            res.status(400).send({ status: false, message: "not a valid user id "})
            return
        }


        if (userIdFromToken != id) {
                        return res.status(403).send({
                          status: false,
                          message: "Unauthorized access.",
                        });
                    }


        const userPresent = await userModel.findById({ _id: id })

        if (!userPresent) return res.status(404).send({ status: false, message: "User not found" })

        const { fname, lname, email, phone, address, password } = data  

        if (fname) {
            if (!validator.isValidValue(fname)) {
                return res.status(400).send({ status: false, message: "Please Send Valid First Name " })
            }
        }

        if (lname) {
            if (!validator.isValidValue(lname)) {
                return res.status(400).send({ status: false, message: "Please Send Valid Last Name " })
            }
        }

        if (email) {
            if (!validator.isValidValue(email)) {
                return res.status(400).send({ status: false, message: "Please Send Valid Email ID " })
            }

            if (!(/^\w+([\.-]?\w+)@\w+([\. -]?\w+)(\.\w{2,3})+$/.test(email))) {
                return res.status(400).send({ status: false, message: "email is not valid" })

            }
        }

        if (phone) {
            if (!validator.isValidValue(phone)) {
                return res.status(400).send({ status: false, message: "Please Send Valid Phone Number " })
            }

            if (!(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/.test(phone))) {
                return res.status(400).send({ status: false, message: "Mobile Number is not valid" })
            }
        }

       

        if (address) {
            const a = JSON.parse(address)  // Converting Striing to JSON
            const { shipping, billing } = a

            if (!validator.isValidValue(shipping.street)) {
                return res.status(400).send({ status: false, message: " Enter Street Name" })
            }

            if (!validator.isValidValue(shipping.city)) {
                return res.status(400).send({ status: false, message: " Enter City Name" })
            }

            if (!validator.isValidValue(shipping.pincode)) {
                return res.status(400).send({ status: false, message: " Enter Pincode" })
            }

            if (!validator.isValidPincode(shipping.pincode)) {
                return res.status(400).send({ status: false, message: "Enter Valid Shipping Pincode" })
            }

            if (!validator.isValidValue(billing.street)) {
                return res.status(400).send({ status: false, message: " Enter Street Name" })
            }

            if (!validator.isValidValue(billing.city)) {
                return res.status(400).send({ status: false, message: " Enter City Name" })
            }

            if (!validator.isValidValue(billing.pincode)) {
                return res.status(400).send({ status: false, message: " Enter Pincode" })
            }

            if (!validator.isValidPincode(billing.pincode)) {
                return res.status(400).send({ status: false, message: "Enter Valid billing Pincode" })
            }


        }

        if (password) {
            if (!validator.isValidValue(data.password)) {
                return res.status(400).send({ status: false, message: "Enter password" })
            }
            if (!(/^.{8,15}$/).test(data.password)) {
                return res.status(400).send({ status: false, message: "Password Length should be between 8 and 15" })
            }
            // generate salt to hash password
            const salt = await bcrypt.genSalt(10);
                                                                
            data.password = await bcrypt.hash(data.password, salt); //// now we set user password to hashed password
        }


        let emailUsed = await userModel.findOne({ email })
        if (emailUsed) {
            return res.status(400).send({ status: false, message: "email must be Unique" })
        }

        let phoneUsed = await userModel.findOne({ phone })
        if (phoneUsed) {
            return res.status(400).send({ status: false, message: "Phone must be Unique" })
        }


        const update = await userModel.findOneAndUpdate({ _id: id }, { $set: data }, { new: true })
       
        update["profileImage"] = uploadedFileURL

        return res.status(200).send({ status: true, message: "User Profile updated", data: update })
    }
    catch (error) {
        console.log(error)
        res.status(500).send({ status: false, message: error.message })
    }
}
module.exports = {
    createUser,
    userLogin,
    getUserDetail,
    updateUser
}
