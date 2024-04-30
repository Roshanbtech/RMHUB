const mongoose = require('mongoose')
mongoose.connect('mongodb://127.0.0.1:27017/RHUB').then(() => {
    console.log('mongodb had connected');
}).catch(() => {
    console.log('mongodb has not connected');
});

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductModel',
            required: true,
        },
    }]
})

const wishlist = mongoose.model('wishlist', wishlistSchema)
module.exports = wishlist