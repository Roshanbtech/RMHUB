const mongoose = require('mongoose');
const Coupon = require('../model/admin/couponmodel');

const addcoupon = async (req, res) => {
    try {
        const { code, discountValue, expirationDate, discountType } = req.body;

        // Calculate discount amount based on discount type
        // let discountAmount;
        // if (discountType === 'fixed') {
        //     discountAmount = discountValue;
        // } else if (discountType === 'percentage') {
        //    discountAmount = discountValue;
        // } else {
        //     discountAmount = 0;
        // }

        const coupon = new Coupon({
            code,
            discountValue,
            discountType,
            expirationDate
        });

        await coupon.save();

        res.redirect('/coupon/coupon?successMessage=Coupon added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const coupon = async (req, res) => {
    try {
        // Fetch coupons from the database or any other source
        const coupons = await Coupon.find();
        const successMessage = req.query.successMessage || '';

        res.render('admin/coupon.ejs', { coupons: coupons, successMessage });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const deletecoupon = async (req, res) => {
    try {
        const couponId = req.params.id;
        await Coupon.findByIdAndDelete(couponId);
        res.redirect('/coupon/coupon?successMessage=Coupon deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    addcoupon,
    coupon,
    deletecoupon
};
