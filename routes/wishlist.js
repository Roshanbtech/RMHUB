const express = require('express');
const router = express.Router();
const wishlistcontroller = require('../controller/wishlistcontroller');
const wishlist = require('../model/user/wishlistmodel');
const user = require('../model/user/usermodel');
const { checkSessionAndBlocked } = require('../middleware/ensureActiveUser');

router.get('/getwishlist', checkSessionAndBlocked, wishlistcontroller.getwishlist)
router.post('/addwishlist/:id', checkSessionAndBlocked, wishlistcontroller.addwishlist);
router.post('/removefromwishlist/:id', checkSessionAndBlocked, wishlistcontroller.removefromwishlist)

module.exports = router;