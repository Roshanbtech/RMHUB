const express = require('express');
const router = express.Router();
const couponcontroller = require('../controller/couponcontroller');
const coupon = require('../model/admin/couponmodel');
const isAdminAuthenticated = require('../middleware/authorizeAdmin');

router.post('/addcoupon',isAdminAuthenticated, couponcontroller.addcoupon)
router.get('/editcoupon/:id',isAdminAuthenticated, couponcontroller.editcoupon)
router.post('/editcoupon/:id',isAdminAuthenticated, couponcontroller.editcouponpost)
router.get('/coupon',isAdminAuthenticated, couponcontroller.coupon)
router.get('/delcoupon/:id',isAdminAuthenticated, couponcontroller.deletecoupon)

module.exports = router