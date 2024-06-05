const mongoose = require('mongoose')
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('mongodb had connected');
}).catch(() => {
  console.log('mongodb has not connected');
});

// Define the function to generate a unique referral code
function generateUniqueReferralCode() {
  // Example: Generate a random string of 6 characters
  return Math.random().toString(36).substring(2, 8);
}


// User schema for storing user information and authentication
const userSchema = new mongoose.Schema({
  firstName: { // User's first name
    type: String,
    required: true
  },
  lastName: { // User's last name
    type: String,
    required: true
  },
  mobileNumber: { // User's mobile number
    type: String,
    validate: {
      validator: function (v) {
        // Check if the input is a valid phone number
        // You can use a different regex pattern depending on your country format
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: { // User's email address
    type: String,
    required: true,
    unique: true
  },
  password: { // User's password
    type: String,
    required: true
  },

  isActive: { // User's account status
    type: Boolean,
    default: true
  },

  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart',
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
  ],
  address: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }]
  ,
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  referalCode: {
    type: String,
    unique: true
    // default: null
  },


  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      amount: {
        type: Number,
        default: 0
      },
      description: {
        type: String
      },
      date: {
        type: Date,
        default: new Date()
      }

    }]
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
});

// Pre-save hook to generate a unique referral code
userSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(); // Skip if the document is not new
  }

  // Generate a unique referral code
  this.referalCode = generateUniqueReferralCode();

  next();
});


userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ referalCode: 1 }, { unique: true }); // Enforce uniqueness on referalCode


const user = mongoose.model('userModel', userSchema);
module.exports = user;