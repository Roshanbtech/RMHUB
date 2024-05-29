var express = require('express')
var router = express.Router()
const usercontroller = require('../controller/usercontroller')
const collection = require('../model/user/usermodel')
const { checkSessionAndBlocked } = require('../middleware/ensureActiveUser');


router.get('/', usercontroller.landing)
router.get('/signup', usercontroller.signup)
router.post('/signup', usercontroller.signuppost)
router.get('/genOtp', usercontroller.mailsender)
router.post('/genOtp', usercontroller.validateOtp)
router.get('/resOtp', usercontroller.resendOtp)
router.get('/login', usercontroller.login)
router.post('/login', usercontroller.loginpost)
router.get('/forpasmail', usercontroller.forpasmail)
router.post('/forpasmail', usercontroller.forpasmailpost)
router.get('/forpasotp', usercontroller.forpasotp)
router.post('/forpasotp', usercontroller.forpasotppost)
router.get('/forpasreset', usercontroller.forpasreset)
router.post('/forpasreset', usercontroller.forpasresetpost)
router.get('/phones', checkSessionAndBlocked, usercontroller.phones)
router.get('/wearables', checkSessionAndBlocked, usercontroller.wearables)
router.get('/tablets', checkSessionAndBlocked, usercontroller.tablets)
router.get('/proddes/:id', checkSessionAndBlocked, usercontroller.proddes)
router.post('/rating/:id', checkSessionAndBlocked, usercontroller.rating)
router.get('/home', checkSessionAndBlocked, usercontroller.home)
router.post('/applyCoupon', checkSessionAndBlocked, usercontroller.applyCoupon)
router.post('/removeCoupon', checkSessionAndBlocked, usercontroller.removeCoupon)
router.get('/logout', checkSessionAndBlocked, usercontroller.logout)




module.exports = router;