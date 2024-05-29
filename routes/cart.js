const express = require('express');
const router = express.Router();
const cartcontroller = require('../controller/cartcontroller');
const collection = require('../model/user/usermodel')
const { checkSessionAndBlocked } = require('../middleware/ensureActiveUser');
const isNotAdmin = require('../middleware/authorizeUser');

router.get('/getcart', checkSessionAndBlocked, cartcontroller.getcart);
router.post('/addtocart', checkSessionAndBlocked, cartcontroller.addtocart);
router.get('/removeitem/:id', checkSessionAndBlocked, cartcontroller.removeitem)
router.post('/updateitem/:itemId', checkSessionAndBlocked, cartcontroller.updateitem);
router.get('/checkout', checkSessionAndBlocked, cartcontroller.checkout);
router.post('/checkout', checkSessionAndBlocked, cartcontroller.checkoutpost);
router.get('/orderhistory', checkSessionAndBlocked, cartcontroller.orderhistory);
router.get('/orderdetails/:id', checkSessionAndBlocked, isNotAdmin({compareId:false}), cartcontroller.orderDetails);
router.get('/cancelorder/:id', checkSessionAndBlocked, isNotAdmin({compareId:false}), cartcontroller.cancelorder); // Corrected function name
router.post('/return/:id', checkSessionAndBlocked, isNotAdmin({compareId:false}), cartcontroller.submitReturnRequest);
router.get("/invoice/:id", checkSessionAndBlocked, isNotAdmin({compareId:false}), cartcontroller.getInvoice);


module.exports = router;
