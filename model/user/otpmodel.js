const mongoose = require('mongoose')
require('dotenv').config()

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('mongodb had connected');
}).catch(() => {
  console.log('mongodb has not connected');
});

// User schema for storing user information and authentication
const otpSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true
  },
  otp: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30
  }
});

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 });

const otp = mongoose.model('otpModel', otpSchema);
module.exports = otp;