const mongoose = require('mongoose');
const Coupon = require('../model/admin/couponmodel');

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

const addcoupon = async (req, res) => {
    try {
        const { code, discountValue, expirationDate, discountType } = req.body;
        const error= req.query.error || '';


        // Validate code
        // if (!code || typeof code !== 'string' || code.trim() === '') {
        //     return res.status(400).json({ message: 'Invalid coupon code' });
        // }

        //Validate discount value
        if (discountValue <= 0) {
           return res.redirect('/coupon/coupon?error=Invalid discount value');
        }

        //Validate discount type and range
        if (discountType === 'fixed') {
            if (discountValue < 100|| discountValue > 5000) {
                return res.redirect('/coupon/coupon?error= Fixed discount value must be between 100 and 5000');
            }
        } else if (discountType === 'percentage') {
            if (discountValue < 1 || discountValue > 100) {
                return res.redirect('/coupon/coupon?error= Percentage discount value must be between 1 and 100');
            }
        } else {
            return res.redirect('/coupon/coupon?error=Invalid discount type');
        }

        // Validate expiration date
        if (!expirationDate || isNaN(new Date(expirationDate).getTime())) {
            return res.redirect('/coupon/coupon?error=Invalid expiration date');
        }

        const existingCoupon = await Coupon.findOne({ code });
        if (existingCoupon) {
            return res.redirect('/coupon/coupon?error=Coupon code already exists');
        }

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

const editcoupon = async (req, res) => {
    try {
         // Get the coupon ID from URL parameters
        const couponId = req.params.id;
        const coupon = await Coupon.findById({ _id: couponId });
        console.log(coupon, 'coupon');

        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        res.json(coupon);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};    

const editcouponpost = async (req, res) => {
    try {
        const couponId = req.params.id;
        const { code, discountValue, expirationDate, discountType } = req.body;

        // Validate discount value
        if (discountValue <= 0) {
            return res.redirect(`/coupon/editcoupon/${couponId}?error=Invalid discount value`);
        }

        // Validate discount type and range
        if (discountType === 'fixed') {
            if (discountValue < 100 || discountValue > 5000) {
                return res.redirect(`/coupon/editcoupon/${couponId}?error=Fixed discount value must be between 100 and 5000`);
            }
        } else if (discountType === 'percentage') {
            if (discountValue < 1 || discountValue > 100) {
                return res.redirect(`/coupon/editcoupon/${couponId}?error=Percentage discount value must be between 1 and 100`);
            }
        } else {
            return res.redirect(`/coupon/editcoupon/${couponId}?error=Invalid discount type`);
        }

        // Validate expiration date
        if (!expirationDate || isNaN(new Date(expirationDate).getTime())) {
            return res.redirect(`/coupon/editcoupon/${couponId}?error=Invalid expiration date`);
        }

        const existingCoupon = await Coupon.findOne({ code, _id: { $ne: couponId } });
        if (existingCoupon) {
            return res.redirect(`/coupon/editcoupon/${couponId}?error=Coupon code already exists`);
        }

        // Find the coupon by ID and update its properties
        await Coupon.findByIdAndUpdate(couponId, {
            code,
            discountValue,
            discountType,
            expirationDate
        });

        res.redirect(`/coupon/coupon?successMessage=Coupon updated successfully`);
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
    editcoupon,
    editcouponpost,
    coupon,
    deletecoupon
};
