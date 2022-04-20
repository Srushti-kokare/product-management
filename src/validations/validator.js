const mongoose = require('mongoose')

const isValidValue = (value) => {
    if (typeof value === "undefined" || value === null)
        return false;
    if (typeof value === "string" && value.trim().length === 0)
        return false;
    return true;
};

let isValidPincode = function (value) {
    if (!isNaN(value) && value.toString().length == 6) return true
};

let validateChar = function(value){
    return /^[A-Za-z\s]+$/.test(value)
};

const isValidDetails = (requestBody) => Object.keys(requestBody).length > 0;

const isValidStatus = (input) => ["cancelled", "completed", "pending"].indexOf(input) !== -1

const isValidObjectId = (objectId) => mongoose.Types.ObjectId.isValid(objectId)

module.exports = { isValidValue, isValidDetails, validateChar, isValidPincode, isValidObjectId, isValidStatus }
