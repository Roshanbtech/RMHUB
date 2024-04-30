const express = require('express');
const router = express.Router();
const profilecontroller = require('../controller/userprofilecontroller');
const User = require('../model/user/usermodel'); // Import User model
const { checkSessionAndBlocked } = require('../middleware/authmiddleware');



router.get('/getprofile', checkSessionAndBlocked, profilecontroller.getprofile)
router.get('/editprofile/:id', checkSessionAndBlocked, profilecontroller.editprofile)
router.post('/editprofile/:id', checkSessionAndBlocked, profilecontroller.updateprofile)
router.get('/addAddress', checkSessionAndBlocked, profilecontroller.addAddressToProfile);
router.post('/addAddress', checkSessionAndBlocked, profilecontroller.addAddressToProfilepost);
router.get('/removeaddress/:addressId', checkSessionAndBlocked, profilecontroller.removeAddress);
router.get('/editaddress/:addressId', checkSessionAndBlocked, profilecontroller.editaddress); // GET request to render the edit address page
router.post('/editaddress/:addressId', checkSessionAndBlocked, profilecontroller.updateaddress); // POST request to handle form submission for editing address
router.get('/changepassword/:id', checkSessionAndBlocked, profilecontroller.changepassword);
router.post('/changepassword/:id', checkSessionAndBlocked, profilecontroller.updatepassword);
router.get("/genreferalcode", checkSessionAndBlocked, profilecontroller.genReferalcode)
router.get('/wallet', checkSessionAndBlocked, profilecontroller.wallet);






module.exports = router