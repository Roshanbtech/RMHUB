const mongoose = require('mongoose')
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('mongodb had connected');
}).catch(() => {
    console.log('mongodb has not connected');
});

//Category Schema for admin to manage category
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean, default: true
    },
    status: {
        type: String
    },
    offerDiscountRate: { type: Number, min: 0, max: 100 },
    onOffer: { type: Boolean, default: false }

})

const category = mongoose.model('CategoryModel', categorySchema)
module.exports = category