const express = require('express');
const router = express.Router();
const profilecontroller = require('../controller/userprofilecontroller');
const User = require('../model/user/usermodel'); // Import User model
const { checkSessionAndBlocked } = require('../middleware/ensureActiveUser');
const isNotAdmin = require('../middleware/authorizeUser');

router.get('/getprofile', checkSessionAndBlocked, profilecontroller.getprofile)
router.get('/editprofile/:id', checkSessionAndBlocked, isNotAdmin(), profilecontroller.editprofile)
router.post('/editprofile/:id', checkSessionAndBlocked, isNotAdmin(), profilecontroller.updateprofile)
router.get('/addAddress', checkSessionAndBlocked, profilecontroller.addAddressToProfile);
router.post('/addAddress', checkSessionAndBlocked, profilecontroller.addAddressToProfilepost);
router.get('/removeaddress/:addressId', checkSessionAndBlocked, profilecontroller.removeAddress);
router.get('/editaddress/:addressId', checkSessionAndBlocked, isNotAdmin(), profilecontroller.editaddress); // GET request to render the edit address page
router.post('/editaddress/:addressId', checkSessionAndBlocked, isNotAdmin(), profilecontroller.updateaddress); // POST request to handle form submission for editing address
router.get('/changepassword/:id', checkSessionAndBlocked, isNotAdmin(), profilecontroller.changepassword);
router.post('/changepassword/:id', checkSessionAndBlocked, isNotAdmin(), profilecontroller.updatepassword);
router.get("/genreferalcode", checkSessionAndBlocked, profilecontroller.genReferalcode)
router.get('/wallet', checkSessionAndBlocked, profilecontroller.wallet);






module.exports = router