const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/RHUB').then(() => {
  console.log('mongodb had connected');
}).catch(() => {
  console.log('mongodb has not connected');
});


const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  discountType: { // New field to specify the type of discount
    type: String,
    enum: ['fixed', 'percentage'], // Allowed values: 'fixed' or 'percentage'
    default: 'fixed' // Default value is 'fixed'
  },
  discountValue: {
    type: Number,
    required: true,
  },

  expirationDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
