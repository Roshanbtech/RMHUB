const mongoose = require('mongoose');
const Product = require('../admin/productmodel');
const User = require("../user/usermodel");

// Define the schema for an order item within an order
const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductModel', // Reference to the Product model
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    }
});

// Define the schema for an order
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'userModel', // Reference to the User model
        required: true
    },
    orderDate: {
        type: Date,
        required: true,
        default: Date.now // Default to current date/time
    },
    orderStatus: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'returned'],
        default: 'pending' // Default to 'pending' status
    },
    orderItems: [orderItemSchema], // Array of order items
    shippingAddress: {
        type: String,
        required: true
    },
    addressString: {
        type: String,
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cod', 'Wallet', 'internetBanking', 'PayPal'] // Add supported payment methods
    },

    totalPrice: {
        type: Number,
        required: true
    },

    appliedCoupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon' // Reference to the Coupon model
    },
    returnRequest: {
        reason: String,
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields to the schema
});




const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
