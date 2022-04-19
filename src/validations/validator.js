const mongoose = require('mongoose')

const isValidValue = (value) => {
    if (typeof value === "undefined" || value === null)
        return false;
    if (typeof value === "string" && value.trim().length === 0)
        return false;
    return true;
};

const isValidDetails = (requestBody) => Object.keys(requestBody).length > 0;

const isValidStatus = (input) => ["cancelled", "completed", "pending"].indexOf(input) !== -1

const isValidSizes = (input) => ["S", "XS","M","X", "L","XXL", "XL"].indexOf(input) !== -1

const isValidObjectId = (objectId) => mongoose.Types.ObjectId.isValid(objectId)

module.exports = { isValidValue, isValidDetails, isValidSizes, isValidObjectId, isValidStatus }