const express = require('express');
const router = express.Router();
const paymentController = require('../controller/paymentcontroller');
const User = require('../model/user/usermodel'); // Import User model
const { checkSessionAndBlocked } = require('../middleware/ensureActiveUser'); // Import the middleware



// router.get('/payment', paymentController.payment)
router.post('/payment', checkSessionAndBlocked, paymentController.payment)
router.get('/paymentstatus', checkSessionAndBlocked, paymentController.paymentstatus)
router.get('/paymentcancel', checkSessionAndBlocked, paymentController.paymentcancel)

router.post('/paymentretry', checkSessionAndBlocked, paymentController.paymentRetry);
router.get('/retrypaymentstatus',checkSessionAndBlocked, paymentController.processRetryPaymentStatus);


router.get('/wallet', checkSessionAndBlocked, paymentController.wallet);
router.post('/addtowallet', checkSessionAndBlocked, paymentController.addToWallet);
router.get('/verifyPayment', checkSessionAndBlocked, paymentController.verifyPayment)

// router.post('/walletPayment', checkSessionAndBlocked, paymentController.walletPayment);
// router.get('/verifyWalletPayment', checkSessionAndBlocked, paymentController.verifyWalletPayment)



module.exports = router