const paypal = require('paypal-rest-sdk');
const axios = require('axios');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const pdf = require('html-pdf');

const { Cart, CartItem } = require("../model/cart/cartmodel");
const User = require('../model/user/usermodel');
const Coupon = require('../model/admin/couponmodel');
const Product = require('../model/admin/productmodel');
const Order = require('../model/cart/ordermodel');

// Configure PayPal SDK
const { PAYPAL_MODE, PAYPAL_CLIENT_KEY, PAYPAL_SECRET_KEY } = process.env;

paypal.configure({
    'mode': PAYPAL_MODE, // sandbox or live
    'client_id': PAYPAL_CLIENT_KEY,
    'client_secret': PAYPAL_SECRET_KEY
});

// Payment controller function
const payment = async (req, res) => {
    try {
        // Validate request data
        if (!req.body || !req.body.amount) {
            return res.status(400).send('Amount is required');git 
        }

        const { amount, address, couponCode } = req.body;
        console.log('Amount:', amount);
        console.log('Address:', address);
        console.log('Coupon Code:', couponCode);
        // Convert INR to USD using a currency conversion API
        const conversionResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const exchangeRate = conversionResponse.data.rates.INR; // Get the exchange rate from INR to USD
        const amountUSD = amount / exchangeRate; // Convert INR to USD

        console.log('Amount (USD):', amountUSD);

        // Create PayPal payment
        const paymentData = {
            intent: 'sale',
            payer: {
                payment_method: 'paypal',

            },
            redirect_urls: {
                return_url: 'http://localhost:3004/payment/paymentstatus',
                cancel_url: 'http://localhost:3004/cart/checkout',
            },
            transactions: [{
                amount: {
                    currency: 'USD',
                    total: amountUSD.toFixed(2), // Round to 2 decimal places
                },

                description: 'Payment',

            }],

            note_to_payer: 'Thank you for your payment!',
        };

        req.session.couponCode = couponCode;
        req.session.address = address;

        // Create PayPal payment
        paypal.payment.create(paymentData, function (error, payment) {
            if (error) {
                console.error('Error creating PayPal payment:', error);
                return res.status(500).send('Error processing payment');
            } else {
                // Extract approval URL from payment response
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
                console.log('Approval URL:', approvalUrl.href);
                if (!approvalUrl) {
                    return res.status(500).send('Approval URL not found');
                }
                res.json({ approvalUrl: approvalUrl.href });
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
};

const paymentstatus = async (req, res) => {
    try {
        // Handle payment status
        // Retrieve payerId, paymentId, and couponCode from query parameters
        console.log(req.query);
        const { PayerID: payerId, paymentId } = req.query;
        const couponCode = req.session.couponCode;
        console.log(couponCode)
        const address = req.session.address;

        const executePaymentData = {
            payer_id: payerId,
            transactions: [{
                amount: {
                    currency: 'USD',
                    total: '1.00',
                },
                description: 'Payment',
                invoice_number: Date.now().toString(), // Generate a unique invoice ID using a timestamp
                payment_method: 'paypal',
            }]
        };

        console.log(executePaymentData);

        paypal.payment.execute(paymentId, executePaymentData, async function (error, payment) {
            if (error) {
                console.error('Error executing PayPal payment:', error);
                return res.status(500).send('Error processing payment');
            } else {
                console.log('Payment processed successfully');

                // Save order and clear cart upon successful payment execution
                try {
                    const userEmail = req.session.user;
                    const user = await User.findOne({ email: userEmail });
                    if (!user) {
                        return res.redirect('/login'); // Redirect to login page if userEmail is not found
                    }
                    const userId = user._id;

                    const cart = await Cart.findOne({ userId }).populate('cartItems.productId');
                    if (!cart) {
                        return res.status(404).json({ error: 'Cart not found' });
                    }

                    // Calculate totalPrice based on cart items and coupons
                    // for (const item of cart.cartItems) {
                    //     totalPrice += item.quantity * item.productId.price;
                    // }

                    // let totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.productId.price), 0); // Initialize totalPrice variable here

                    let totalPrice = cart.totalPrice
                    console.log(totalPrice)
                    // const coupon = await Coupon.findOne({ code: couponCode });
                    // if (coupon) {
                    //     totalPrice -= coupon.discountValue;
                    // } else {
                    //     totalPrice: totalPrice;
                    // }



                    //Create the order
                    const orderItems = cart.cartItems.map((item) => ({
                        productId: item.productId._id,
                        quantity: item.quantity,
                        price: item.price,
                    }));

                    console.log('Order items:', orderItems);
                    let newOrder = new Order({
                        userId,
                        orderItems,
                        totalPrice,
                        shippingAddress: address, // Update with actual shipping address
                        paymentMethod: 'PayPal', // Update with actual payment method
                    });

                    if(cart.coupon){
                        const coupon = await Coupon.findOne({ _id: cart.coupon });
                        newOrder.appliedCoupon = coupon._id;
                        newOrder.discountValue = cart.couponDiscount;
                        newOrder.orderItems.forEach((item) => {
                            item.couponId = coupon._id;
                        })
                    }

                    await newOrder.save();
                    console.log('Order saved successfully');

                    // Update product stock and clear cart
                    for (const item of cart.cartItems) {
                        const prod = await Product.findById(item.productId);
                        console.log('items', cart.cartItems)
                        if (prod) {
                            prod.availableStock -= item.quantity;
                            await prod.save();
                        }
                    }

                    cart.cartItems = [];
                    cart.totalPrice = 0;
                    cart.coupon = undefined;
                    cart.couponDiscount = 0;
                    await cart.save();

                    // Redirect or render success page
                    return res.render('order/ordersuccess', { order: newOrder, totalPrice: totalPrice, user: user });
                } catch (error) {
                    console.error('Error processing order:', error);
                    return res.status(500).send('Error processing order');
                }
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
};


const paymentcancel = async (req, res) => {
    try {
        // Handle payment cancellation
        res.render('cart/cancelpay');
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
};

const wallet = async (req, res) => {
    const userWallet = await User.findOne({ _id: req.session.user, wallet: { $gt: 0 } });
    if (!userWallet) {
        return res.redirect('/profile');
    } else {
        let totalCost = userWallet.wallet;
        for (let i = 0; i < userWallet.orders.length; i++) {
            totalCost += userWallet.orders[i].totalPrice;
        }
        return res.render('profile/wallet', { userWallet, totalCost });
    }
    console.log(userWallet);

}

const addToWallet = async (req, res) => {
    try {
        // Validate request data
        if (!req.body || !req.body.amount) {
            return res.status(400).send('Amount is required');
        }

        const { amount } = req.body;
        console.log('Amount:', amount);

        req.session.amount = amount;

        // Convert INR to USD using a currency conversion API
        const conversionResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const exchangeRate = conversionResponse.data.rates.INR; // Get the exchange rate from INR to USD
        const amountUSD = amount / exchangeRate; // Convert INR to USD

        console.log('Amount (USD):', amountUSD);

        // Create PayPal payment
        const paymentData = {
            intent: 'sale',
            payer: {
                payment_method: 'paypal',

            },
            redirect_urls: {
                return_url: 'http://localhost:3004/payment/verifyPayment',
                cancel_url: 'http://localhost:3004/wallet/paymentcancel',
            },
            transactions: [{
                amount: {
                    currency: 'USD',
                    total: amountUSD.toFixed(2), // Round to 2 decimal places
                },

                description: 'Payment',

            }],

            note_to_payer: 'Thank you for your payment!',
        };


        // Create PayPal payment
        paypal.payment.create(paymentData, function (error, payment) {
            if (error) {
                console.error('Error creating PayPal payment:', error);
                return res.status(500).send('Error processing payment');
            } else {
                // Extract approval URL from payment response
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
                console.log('Approval URL:', approvalUrl.href);
                if (!approvalUrl) {
                    return res.status(500).send('Approval URL not found');
                }
                res.json({ approvalUrl: approvalUrl.href });
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
};

const verifyPayment = async (req, res) => {
    try {
        // Handle payment status
        // Retrieve payerId, paymentId, and couponCode from query parameters
        console.log(req.query);
        const { PayerID: payerId, paymentId } = req.query;

        const executePaymentData = {
            payer_id: payerId,
            transactions: [{
                amount: {
                    currency: 'USD',
                    total: '1.00',
                },
                description: 'Payment',
                invoice_number: Date.now().toString(), // Generate a unique invoice ID using a timestamp
                payment_method: 'paypal',
            }]
        };

        console.log(executePaymentData);

        paypal.payment.execute(paymentId, executePaymentData, async function (error, payment) {
            if (error) {
                console.error('Error executing PayPal payment:', error);
                return res.status(500).send('Error processing payment');
            } else {
                console.log('Payment processed successfully');

                // Save order and clear cart upon successful payment execution
                try {
                    const userEmail = req.session.user;
                    const user = await User.findOne({ email: userEmail });
                    if (!user) {
                        return res.redirect('/login'); // Redirect to login page if userEmail is not found
                    }
                    const userId = user._id;
                    const amount = parseInt(req.session.amount);

                    user.wallet.balance += amount;

                    user.wallet.transactions.push({

                        amount: amount,
                        date: new Date(),
                        description: 'Money added to Wallet'
                    })

                    await user.save();


                    return res.render('profile/wallet', { user, amount });


                } catch (error) {
                    console.error('Error processing order:', error);
                    return res.status(500).send('Error processing order');
                }
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
};

const walletPayment = async (req, res) => {
    try {
        // Validate request data
        if (!req.body || !req.body.amount) {
            return res.status(400).send('Amount is required');
        }

        const { amount, address } = req.body;
        console.log('Amount:', amount);
        console.log('Shipping Address:', address);

        req.session.amount = amount;
        req.session.address = address;

        // Convert INR to USD using a currency conversion API
        const conversionResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const exchangeRate = conversionResponse.data.rates.INR; // Get the exchange rate from INR to USD
        const amountUSD = amount / exchangeRate; // Convert INR to USD

        console.log('Amount (USD):', amountUSD);

        // Create PayPal payment
        const paymentData = {
            intent: 'sale',
            payer: {
                payment_method: 'paypal',

            },
            redirect_urls: {
                return_url: 'http://localhost:3004/payment/verifyWalletPayment',
                cancel_url: 'http://localhost:3004/payment/paymentcancel',
            },
            transactions: [{
                amount: {
                    currency: 'USD',
                    total: amountUSD.toFixed(2), // Round to 2 decimal places
                },

                description: 'Payment',

            }],

            note_to_payer: 'Thank you for your payment!',
        };


        // Create PayPal payment
        paypal.payment.create(paymentData, function (error, payment) {
            if (error) {
                console.error('Error creating PayPal payment:', error);
                return res.status(500).send('Error processing payment');
            } else {
                // Extract approval URL from payment response
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
                console.log('Approval URL:', approvalUrl.href);
                if (!approvalUrl) {
                    return res.status(500).send('Approval URL not found');
                }
                res.json({ approvalUrl: approvalUrl.href });
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }

}

const verifyWalletPayment = async (req, res) => {

    try {
        // Handle payment status
        // Retrieve payerId, paymentId, and couponCode from query parameters
        console.log(req.query);
        const { PayerID: payerId, paymentId } = req.query;
        const couponCode = req.session.couponCode;
        console.log(couponCode)
        const address = req.session.address;

        const executePaymentData = {
            payer_id: payerId,
            transactions: [{
                amount: {
                    currency: 'USD',
                    total: '1.00',
                },
                description: 'Payment',
                invoice_number: Date.now().toString(), // Generate a unique invoice ID using a timestamp
                payment_method: 'paypal',
            }]
        };

        console.log(executePaymentData);

        paypal.payment.execute(paymentId, executePaymentData, async function (error, payment) {
            if (error) {
                console.error('Error executing PayPal payment:', error);
                return res.status(500).send('Error processing payment');
            } else {
                console.log('Payment processed successfully');

                // Save order and clear cart upon successful payment execution
                try {
                    const userEmail = req.session.user;
                    const user = await User.findOne({ email: userEmail });
                    if (!user) {
                        return res.redirect('/login'); // Redirect to login page if userEmail is not found
                    }
                    const userId = user._id;

                    const cart = await Cart.findOne({ userId }).populate('cartItems.productId');
                    if (!cart) {
                        return res.status(404).json({ error: 'Cart not found' });
                    }

                    // Calculate totalPrice based on cart items and coupons
                    // for (const item of cart.cartItems) {
                    //     totalPrice += item.quantity * item.productId.price;
                    // }

                    // let totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.productId.price), 0); // Initialize totalPrice variable here

                    let totalPrice = cart.totalPrice
                    console.log(totalPrice)
                    const coupon = await Coupon.findOne({ code: couponCode });
                    if (coupon) {
                        totalPrice -= coupon.discountValue;
                    } else {
                        totalPrice: totalPrice;
                    }



                    //Create the order
                    const orderItems = cart.cartItems.map((item) => ({
                        productId: item.productId._id,
                        quantity: item.quantity,
                        price: item.price,
                    }));

                    console.log('Order items:', orderItems);
                    const newOrder = new Order({
                        userId,
                        orderItems,
                        totalPrice,
                        shippingAddress: address, // Update with actual shipping address
                        paymentMethod: 'Wallet', // Update with actual payment method
                    });

                    await newOrder.save();
                    console.log('Order saved successfully');

                    // Update user Wallet balance 

                    const amount = parseInt(req.session.amount);

                    user.wallet.balance -= amount;

                    user.wallet.transactions.push({

                        amount: amount,
                        date: new Date(),
                        description: 'Item Purchased',
                    })

                    await user.save();

                    // Update product stock and clear cart
                    for (const item of cart.cartItems) {
                        const prod = await Product.findById(item.productId);
                        console.log('items', cart.cartItems)
                        if (prod) {
                            prod.availableStock -= item.quantity;
                            await prod.save();
                        }
                    }

                    cart.cartItems = [];
                    cart.totalPrice = 0;
                    await cart.save();

                    // Redirect or render success page
                    return res.render('order/ordersuccess', { order: newOrder, totalPrice: totalPrice, user: user });
                } catch (error) {
                    console.error('Error processing order:', error);
                    return res.status(500).send('Error processing order');
                }
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
}


module.exports = {
    payment,
    paymentstatus,
    paymentcancel,
    wallet,
    addToWallet,
    verifyPayment,
    walletPayment,
    verifyWalletPayment
};
