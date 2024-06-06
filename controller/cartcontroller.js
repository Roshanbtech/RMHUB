const { Cart, CartItem } = require("../model/cart/cartmodel");
const User = require('../model/user/usermodel');
const product = require('../model/admin/productmodel');
const Order = require('../model/cart/ordermodel');
const address = require('../model/profile/addressmodel');
const Coupon = require('../model/admin/couponmodel');
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb');



const addtocart = async (req, res) => {
    try {
        const productId = req.body.productId;
        const quantity = parseInt(req.body.quantity);
        const userEmail = req.session.user;

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            // return res.status(404).json({ error: 'User not found' });
            return res.redirect('/login'); // Redirect to login page if userEmail is not found

        }
        const userId = user._id;

        const prod = await product.findById(productId);
        if (!prod) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the requested quantity is greater than the available stock
        if (quantity > prod.availableStock) {
            return res.status(400).json({ error: 'Requested quantity exceeds available stock' });

        }

        const onOffer = prod.onOffer;
        const offerPrice = onOffer ? prod.offerPrice : 0; // Set offerPrice to 0 if no offer is applied
        const price = onOffer ? prod.offerPrice : prod.price; // Use offerPrice if an offer is applied, otherwise use regular price

        // Your existing code...

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                cartItems: [],
            });
            await cart.save(); // Save the newly created cart
            req.session.cartId = cart._id; // Set the cartId session variable
        }

        const existingItem = cart.cartItems.find(item => item.productId.equals(productId));
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.cartItems.push({
                productId,
                quantity,
                price,
                offerPrice,
                onOffer

            });
        }

        cart.totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.price), 0);

        await cart.save();

        req.session.cartId = cart._id;

        return res.redirect("/cart/getcart");
    } catch (error) {
        console.error('Error adding product to cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getcart = async (req, res) => {
    try {
        const userEmail = req.session.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            // return res.render('cart/cartdetails.ejs', { message: 'User not found' });
            return res.redirect('/login'); // Redirect to login page if userEmail is not found
        }

        const cart = await Cart.findOne({ userId: user._id }).populate('cartItems.productId');
        const totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.price), 0);

        if (!cart) {
            cart = new Cart({
                userId: user._id,
                cartItems: []
            });
            await cart.save();
            req.session.cartId = cart._id;
        }

        // Calculate total price using regular price or offer price depending on whether an offer is applied


        if (!cart || cart.cartItems.length === 0) {
            const emptyCart = { cartItems: [] };
            return res.render('cart/cartdetails.ejs', { userCart: emptyCart, userEmail, totalPrice });
        }


        req.session.cartId = cart._id;


        res.render('cart/cartdetails.ejs', { cart, userEmail, userCart: cart, totalPrice });

    } catch (error) {
        console.error('Error fetching user cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const removeitem = async (req, res) => {
    try {
        const itemId = req.params.id;
        const userEmail = req.session.user;

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedCart = await Cart.findOneAndUpdate(
            { userId: user._id },
            { $pull: { cartItems: { _id: itemId } } },
            { new: true }
        ).populate('cartItems.productId');

        if (!updatedCart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const totalPrice = updatedCart.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        res.render('cart/cartdetails.ejs', { userCart: updatedCart, totalPrice, userEmail, message: 'Item removed from cart successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateitem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        const userEmail = req.session.user;
        //   const productId = req.body.productId;


        const user = await User.findOne({ email: userEmail });
        if (!user) {
            // return res.status(404).json({ error: 'User not found' });
            return res.redirect('/login'); // Redirect to login page if userEmail is not found

        }

        // const prod = await product.findById(productId);
        // if (!prod) {
        //     return res.status(404).json({ error: 'Product not found' });
        // }

        //   // Check if the requested quantity is greater than the available stock
        //   if (quantity > prod.availableStock) {
        //     return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
        // }

        const cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cartItem = cart.cartItems.find(item => item._id.equals(itemId));
        if (!cartItem) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        // Retrieve the product details to check available stock
        const prod = await product.findById(cartItem.productId);
        if (!prod) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if the requested quantity is greater than the available stock
        if (quantity > prod.availableStock) {
            return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
        }

        cartItem.quantity = quantity;
        console.log(cartItem.quantity);

        // Recalculate subtotal for the updated item
        const subtotal = cartItem.price * quantity;

        // Recalculate total price of the cart
        cart.totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.price), 0);


        await cart.save();

        return res.status(200).json({ message: 'Item quantity updated successfully', subtotal: subtotal, totalPrice: cart.totalPrice });
    } catch (error) {
        console.error('Error updating item quantity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const checkout = async (req, res) => {
    try {
        const cartId = req.session.cartId;
        if (!cartId) {
            // return res.status(400).json({ error: 'Cart ID not found in session' });
            return res.redirect('/login');
        }
        const user = await User.findOne({ email: req.session.user }).populate('address');
        if (!user) {
            // return res.status(404).json({ error: 'User not found' });
            return res.redirect('/login');
        }
        const cart = await Cart.findById(cartId).populate('cartItems.productId');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }


        let totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.price), 0);


        let insufficient = false;


        let coupon = { isApplied: false, couponCode: '' };

        if (cart.coupon) {
            totalPrice = cart.totalPrice;
            let couponCode = await Coupon.findOne({ _id: cart.coupon });
            coupon = { isApplied: true, couponCode: couponCode.code, discountValue: cart.couponDiscount.toFixed(2), type: couponCode.discountType };
        }

        if (user.wallet.balance < totalPrice) {
            insufficient = true;
        }

        const activeCoupons = await Coupon.find({ isActive: true, expirationDate: { $gte: new Date() } });

        return res.render('cart/checkout.ejs', { user, userCart: cart, totalPrice, userEmail: req.session.user, cartItems: cart.cartItems, coupons: activeCoupons, insufficient, coupon });
    } catch (error) {
        console.error('Error fetching user cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const checkoutpost = async (req, res) => {
    try {
        const userEmail = req.session.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            // return res.status(404).json({ error: 'User not found' });
            return res.redirect('/login'); // Redirect to login page if userEmail is not found

        }
        const userId = user._id; // Change this line if you are using user's id
        console.log(userId)

        const { shippingAddress, paymentMethod, couponCode } = req.body;
        console.log(shippingAddress, paymentMethod, couponCode)

        let Address = await address.findOne({ _id: shippingAddress });
        Address = `${Address.addressLineOne},${Address.addressLineTwo}, ${Address.city}, ${Address.state}, ${Address.pincode}`;
        const cart = await Cart.findOne({ userId: userId }).populate('cartItems.productId');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        // const totalPrice = cart.cartItems.reduce((total, item) => total + (item.quantity * item.productId.price), 0);
        const totalPrice = cart.totalPrice;
        // const selectedCoupon = await Coupon.findOne({ code: couponCode });
        // console.log(selectedCoupon)

        // let discountedPrice = totalPrice;
        // console.log(discountedPrice)

        // // Apply discount if a valid coupon is found
        // if (selectedCoupon) {
        //     // Subtract the discountValue from the total price
        //     discountedPrice -= selectedCoupon.discountValue;
        //     console.log(discountedPrice)
        // }
        // Apply discount if discountValue is present
        // const discountedPrice = discountValue ? totalPrice - discountValue : totalPrice;
        // console.log(discountedPrice)

        let orderItems = cart.cartItems.map((item) => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.price,
        }));

        let newOrder = new Order({
            userId: userId, // Change this line if you are using user's id
            orderItems,
            shippingAddress: Address,
            totalPrice: cart.totalPrice,
            paymentMethod,
            orderStatus: 'confirmed'
        });

        if (paymentMethod === "Wallet") {

            user.wallet.balance -= newOrder.totalPrice;
            user.wallet.transactions.push({
                amount: newOrder.totalPrice,
                date: new Date(),
                type: "Debit",
                description: "Item Purchased",
            });
            await user.save();
        }
        if (cart.coupon) {
            const coupon = await Coupon.findOne({ _id: cart.coupon });
            newOrder.appliedCoupon = coupon._id;
            newOrder.couponDiscount = cart.couponDiscount;
            // newOrder.totalPrice -= cart.couponDiscount;
            newOrder.orderItems.forEach((item) => {
                item.couponId = coupon._id;
            })
        }

        await newOrder.save();

        for (const item of cart.cartItems) {
            const prod = await product.findById(item.productId);
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
        res.render('order/ordersuccess', { order: newOrder, user });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// const orderhistory = async (req, res) => {
//     try {
//         const userEmail = req.session.user;
//         const user = await User.findOne({ email: userEmail });
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         const orderDetails = await Order.find({ userId: user._id  })
//             .sort({ createdAt: -1}) // Sort by createdAt field in descending order
//             .populate('orderItems.productId');

//             if (!orderDetails || orderDetails.length === 0) {
//                 return res.render('order/orderhistory', { orderDetails: [] });
//             }
//             console.log(orderDetails);

//         res.render('order/orderhistory', { orderDetails: orderDetails }); // Render the order history template with the most recent order
//     } catch (error) {
//         console.error('Error fetching order history:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }
const orderhistory = async (req, res) => {
    try {
        const userEmail = req.session.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            // return res.status(404).json({ error: 'User not found' });
            return res.redirect('/login'); // Redirect to login page if userEmail is not found
        }

        const page = parseInt(req.query.page) || 1; // Get the page number from query parameters, default to page 1
        const limit = 5; // Number of orders per page
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const totalOrders = await Order.countDocuments({ userId: user._id }); // Get total number of orders

        const orderDetails = await Order.find({ userId: user._id })
            .sort({ createdAt: -1 }) // Sort by createdAt field in descending order
            .skip(startIndex) // Skip records based on pagination
            .limit(limit) // Limit records based on pagination
            .populate('orderItems.productId');

        const cancelledOrders = await Order.find({ userId: user._id, orderStatus: 'cancelled' }).populate('orderItems.productId').sort({ createdAt: -1 });
        console.log(cancelledOrders, 'cancelled')



        const totalPages = Math.ceil(totalOrders / limit); // Calculate total number of pages

        if (!orderDetails || orderDetails.length === 0) {
            return res.render('order/orderhistory', { orderDetails: [], totalPages, currentPage: page, cancelledOrders });
        }

        res.render('order/orderhistory', { orderDetails, totalPages, currentPage: page, cancelledOrders });

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const orderDetails = async (req, res) => {
    try {
        const userEmail = req.session.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.redirect('/login');
        }
        const orderId = req.params.id;
        const order = await Order.findOne({ _id: orderId }).populate('orderItems.productId');
        res.render('order/orderDetails', { order })
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const cancelorder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);
        if (!order) {
            // return res.status(404).json({ error: 'Order not found' });
            return res.render('order/cancelorder.ejs', { message: 'Order not found' });
        }

        for (const item of order.orderItems) {
            const prod = await product.findById(item.productId);
            if (prod) {
                prod.availableStock += item.quantity;
                await prod.save();
            }
        }

        let totalAmountSpent = 0;
        for (const item of order.orderItems) {
            totalAmountSpent += item.quantity * item.price;
        }

        // Check if a coupon was applied
        if (order.totalPrice !== totalAmountSpent) {
            // Adjust totalAmountSpent if a coupon was applied
            totalAmountSpent = order.totalPrice;
        }

        const user = await User.findById(order.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (order.paymentMethod === 'PayPal' || order.paymentMethod === 'Wallet') {
            user.wallet.balance += totalAmountSpent;
            user.wallet.transactions.push({
                amount: totalAmountSpent,
                description: 'Refund for cancelled order',
                date: new Date()
            });
        }

        await user.save();



        order.orderStatus = 'cancelled';
        order.paymentStatus = 'refunded';
        await order.save();



        // Delete the order from the database
        // await Order.findByIdAndDelete(orderId);

        // Redirect the user back to the order history page
        res.redirect('/cart/orderhistory?successMessage=Order cancelled successfully');

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const submitReturnRequest = async (req, res) => {

    try {
        const orderId = req.params.id;
        console.log(orderId);
        const { reason } = req.body;

        // Find the order by ID and update it with the return reason
        const order = await Order.findByIdAndUpdate(orderId, { returnRequest: reason }, { new: true });
        console.log(order);

        // Check if the order was found and updated
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Send a success response
        res.redirect('/cart/orderhistory?successMessage=Return request submitted successfully');
        // res.status(200).json({ message: "Return request submitted successfully"});
    } catch (error) {
        // Handle errors
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}



const getInvoice = async (req, res) => {
    try {
        const invoiceId = `RM${Math.floor(1000 + Math.random() * 9000)}`;
        const { id } = req.params;

        let order = await Order.aggregate([
            {
                $match: { _id: new ObjectId(id), orderStatus: 'delivered' },
            },
            {
                $unwind: '$orderItems',
            },
            {
                $lookup: {
                    from: 'productmodels',
                    localField: 'orderItems.productId',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            {
                $unwind: '$product',
            },
            {
                $set: {
                    'orderItems.product_name': '$product.model',
                    'orderItems.description': '$product.description',
                    'orderItems.itemTotal': { $multiply: ['$orderItems.price', '$orderItems.quantity'] },
                }
            },
            {
                $group: {
                    _id: '$_id',
                    orderItems: { $push: '$orderItems' },
                    orderStatus: { $first: '$orderStatus' },
                    shippingAddress: { $first: '$shippingAddress' },
                    userId: { $first: '$userId' },
                    totalPrice: { $first: '$totalPrice' },
                    appliedCoupon: { $first: '$appliedCoupon' },
                    couponDiscount: { $first: '$couponDiscount' },
                    gstPercentage: { $first: '$gstPercentage' },
                    gstAmount: { $first: '$gstAmount' },
                }
            },
            {
                $lookup: {
                    from: 'coupons',
                    localField: 'appliedCoupon',
                    foreignField: '_id',
                    as: 'couponDetails',
                },
            },
            {
                $unwind: {
                    path: '$couponDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $set: {
                    discountValue: { $ifNull: ['$couponDetails.discountValue', 0] },
                    discountType: { $ifNull: ['$couponDetails.discountType', ''] },
                }
            }
        ]);

        order = order[0];

        if (order.discountType === 'percentage') {
            order.discountValue = order.couponDiscount;
        }

        console.log(order, 'order');

        if (!order) {
            return res.status(404).send("Order not found");
        }

        if (!order.gstPercentage || !order.gstAmount) {
            const gstPercentage = Math.floor(Math.random() * 20) + 1;
            const gstAmount = (gstPercentage / 100) * order.totalPrice;

            await Order.updateOne(
                { _id: order._id },
                { $set: { gstPercentage, gstAmount } }
            );

            order.gstPercentage = gstPercentage;
            order.gstAmount = gstAmount;
        }


        // Fetch user details if needed
        const user = await User.findById(order.userId);
        console.log(user);

        res.render('cart/invoice', {
            title: 'Invoice',
            invoiceId,
            order,
            user
        });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).send("Error fetching invoice");
    }
};





module.exports = { getcart, addtocart, removeitem, checkout, checkoutpost, updateitem, orderhistory, orderDetails, cancelorder, submitReturnRequest, getInvoice };
