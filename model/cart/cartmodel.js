const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('mongodb had connected');
}).catch(() => {
    console.log('mongodb has not connected');
});
const Coupon = require('../admin/couponmodel');

// const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: { // ID of the product in the cart
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductModel',
        required: true
    },
    quantity: { // Quantity of the product in the cart
        type: Number,
        required: true,
        min: 1 // Minimum quantity should be 1
    },
    price: { // Price of the product 
        type: Number,
        required: true
    },
    offerPrice: {
        type: Number,
        default: 0
    },
    onOffer: {
        type: Boolean,
        default: false
    },

    createdAt: { // Date when the cart item was created
        type: Date,
        default: Date.now
    }

});

const CartItem = mongoose.model('CartItem', cartItemSchema);

const cartSchema = new mongoose.Schema({
    userId: { // ID of the user who owns the cart
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    cartItems: [cartItemSchema], // Array of cart items
    totalPrice: {
        type: Number,
        default: 0
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
    },
    couponDiscount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields to the schema
});
// cartSchema.pre('save', async function(next) {
//     try {
//         let totalPrice = 0;
//         for (const item of this.cartItems) {
//             totalPrice += item.price * item.quantity;
//         }
//         this.totalPrice = totalPrice;
//         next();
//     } catch (error) {
//         next(error);
//     }
// });


cartSchema.pre('save', async function (next) {
    try {
        let totalPrice = 0;
        for (const item of this.cartItems) {
            // Calculate the priceToAdd based on whether an offerPrice is available
            const priceToAdd = item.offerPrice ? item.offerPrice : item.price;
            console.log(priceToAdd)
            totalPrice += priceToAdd * item.quantity;
            console.log(totalPrice)
        }
        this.totalPrice = totalPrice;

        if(this.coupon) {
            const coupon = await Coupon.findById(this.coupon);
            console.log(coupon, 'coupon')
            if(coupon) {
                let discountAmount = 0;
                if(coupon.discountType === 'percentage') {
                    discountAmount = this.totalPrice * (coupon.discountValue / 100);
                }
                if(coupon.discountType === 'fixed') {
                    discountAmount = coupon.discountValue;
                } 
                
                this.couponDiscount = Math.round(discountAmount);
                this.totalPrice = this.totalPrice - Math.round(discountAmount);
                console.log(this);
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Method to add a new item to the cart
// If the product is already in the cart, it will increase its quantity by one
// Otherwise, it creates a new cart item with this product and adds it to the array of cart items   
// cartSchema.methods.addToCart = async function(product) {
//     const cartItem = this.cartItems.find(item => item.productId.toString() === product._id.toString());
//     if (cartItem) {
//         cartItem.quantity++;
//     } else {
//         this.cartItems.push({
//             productId: product._id,
//             quantity: 1,
//             price: product.price
//         });
//     }
//     await this.save();
//     return this;            
// };  

const Cart = mongoose.model("cart", cartSchema);

module.exports = { Cart, CartItem }