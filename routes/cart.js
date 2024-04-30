const express = require('express');
const router = express.Router();
const cartcontroller = require('../controller/cartcontroller');
const collection = require('../model/user/usermodel')
const { checkSessionAndBlocked } = require('../middleware/authmiddleware');


router.get('/getcart', checkSessionAndBlocked, cartcontroller.getcart);
router.post('/addtocart', checkSessionAndBlocked, cartcontroller.addtocart);
router.get('/removeitem/:id', checkSessionAndBlocked, cartcontroller.removeitem)
router.post('/updateitem/:itemId', checkSessionAndBlocked, cartcontroller.updateitem);
router.get('/checkout', checkSessionAndBlocked, cartcontroller.checkout);
router.post('/checkout', checkSessionAndBlocked, cartcontroller.checkoutpost);
router.get('/orderhistory', checkSessionAndBlocked, cartcontroller.orderhistory);
router.get('/cancelorder/:id', checkSessionAndBlocked, cartcontroller.cancelorder); // Corrected function name
router.post('/return/:id', checkSessionAndBlocked, cartcontroller.submitReturnRequest);


module.exports = router;
