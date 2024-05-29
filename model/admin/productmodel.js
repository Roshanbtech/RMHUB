const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('mongodb had connected');
}).catch(() => {
  console.log('mongodb has not connected');
});

const productSchema = new mongoose.Schema({

  productName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  model: { type: String, required: true },
  description: { type: String, required: true },
  availableStock: { type: Number, required: true, min: 1 },
  image: [{ type: String, required: true }],
  // category: { type: String, required: true },
  isListed: { type: Boolean, default: true },
  status: { type: String },
  ratings: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: Number, default: 0, min: 0, max: 5 }],
  reviews: [{ type: String }],
  shape: { type: String },
  color: { type: String },
  offerPrice: { type: Number, min: 0 },
  discount: { type: Number, min: 0, max: 100 },
  onOffer: { type: Boolean, default: false },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryModel', required: true },

});


const products = mongoose.model('ProductModel', productSchema)
module.exports = products