const wishlist = require('../model/user/wishlistmodel');
const User = require('../model/user/usermodel');
const Product = require('../model/admin/productmodel')
const mongoose = require('mongoose')


const getwishlist = async (req, res) => {
  try {
    const useremail = req.session.user;
    const user = await User.findOne({ email: useremail });
    if (!user) return res.redirect('/login');

    const userId = user._id;
    const userWishlist = await wishlist.findOne({ userId }).populate('items.productId');
    res.render('user/wishlist.ejs', { wishlist: userWishlist, useremail });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).send('Internal Server Error');
  }
}


const isInWishlist = async (req, res) => {
  try {
    const useremail = req.session.user;
    const user = await User.findOne({ email: useremail });
    if (!user) return res.redirect('/login');

    const userId = user._id;
    const productId = req.params.id;

    const existingWishlist = await wishlist.findOne({ userId, 'items.productId': productId });

    res.json({ isInWishlist: !!existingWishlist });
  } catch (error) {
    console.error('Error checking if product is in wishlist:', error);
    res.status(500).send('Internal Server Error');
  }
};

const addwishlist = async (req, res) => {
  try {
    const useremail = req.session.user;
    const user = await User.findOne({ email: useremail });
    if (!user) return res.redirect('/login');

    const userId = user._id;
    const productId = req.params.id;

    if (!productId || productId === 'undefined') {
      return res.status(400).send('Invalid productId');
    }


    console.log('Adding product', productId, 'to wishlist of user', userId);

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const isInWishlist = await wishlist.findOne({ userId, 'items.productId': productId });
    if (isInWishlist) {
      return res.redirect('/wishlist/getwishlist');
    } else {
      await wishlist.updateOne({ userId }, { $push: { items: { productId } } }, { upsert: true });
      return res.redirect('/wishlist/getwishlist');
    }
  } catch (error) {
    console.error('Error adding product to wishlist:', error);
    res.status(500).send('Internal Server Error');
  }
};

const removefromwishlist = async (req, res) => {
  try {
    const useremail = req.session.user;
    const user = await User.findOne({ email: useremail });
    if (!user) return res.redirect('/login');

    const userId = user._id;
    const productId = req.params.id; // Extract productId from req.params

    console.log('Removing product', productId, 'from wishlist of user', userId);

    const updateResult = await wishlist.updateOne({ userId }, { $pull: { items: { productId: productId } } });
    console.log('Update result:', updateResult);

    return res.redirect('/wishlist/getwishlist');
  } catch (err) {
    console.error('Error removing product from wishlist:', err);
    res.status(500).send('Internal Server Error');
  }
}


module.exports = {
  getwishlist,
  isInWishlist,
  addwishlist,
  removefromwishlist
};
