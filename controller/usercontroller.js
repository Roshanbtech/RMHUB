const bcrypt = require('bcrypt');
const validator = require('validator');
const collection = require('../model/user/usermodel')
const collection2 = require('../model/user/otpmodel')
const collection3 = require('../model/admin/productmodel')
//const Cart=require('../model/cart/cartmodel')
const { Cart, CartItem } = require("../model/cart/cartmodel")
const Category = require('../model/admin/categorymodel');
const Coupon = require('../model/admin/couponmodel');
const Order = require('../model/cart/ordermodel');
const nodemailer = require('nodemailer')
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  }
});
console.log(transporter,'transporter');

const landing = (req, res) => {
  res.render('user/landing.ejs')
}

const signup = async (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/home')
  }
  res.render('user/signup.ejs')
}

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

const signuppost = async (req, res) => {
  try {
    let data = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      mobileNumber: req.body.mobileNumber,
      referalCode: req.body.referalCode || 'Not Created' // Default value if referalCode is not provided
    };

   
    // Check if user already exists
    const existingUser = await collection.findOne({ email: data.email });
    // console.log(existingUser);
    if (existingUser) {
      res.render('user/signup.ejs', { exists: "User Already Exists" });
    }

    // if (req.body.password !== req.body.confirmPassword) {
    //   return res.render('user/signup.ejs', { error: 'Passwords do not match' });
    // }


    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    data.password = hashedPassword;

    // Save user to database
    // await new collection(data).save();
    // await collection.insertMany(data);

    req.session.data = data
    await mailsender(data);
    res.render('user/otp.ejs');
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  };
}

let genotp = () => {
  return Math.floor(1000 + Math.random() * 9000);
}

const mailsender = async (data) => {
  console.log("MAILSENDER");

  // Generate OTP
  const generatedOTP = genotp();
  console.log(generatedOTP);

  try {
    // Create OTP document
    const otpDocument = new collection2({
      email: data.email,
      otp: generatedOTP,
    });

    // Try to save the OTP document
    await otpDocument.save();
    console.log(otpDocument,'otpDocument')


    // Send the email with the generated OTP
    transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: data.email,
      subject: "OTP Verification",
      text: `Your OTP is: ${generatedOTP}`
    }, (err, info) => {
      if (err) {
        console.log("Error sending email:", err);
      } else {
        console.log("Email sent successfully. Message ID:", info.messageId);
      }
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000 && error.keyValue.email === data.email) {
      console.log("Email already exists in OTP collection. Updating OTP...");
      // Find and update the existing OTP document
      await collection2.findOneAndUpdate(
        { email: data.email },
        { $set: { otp: generatedOTP } },
        { new: true }
      );
      // Resend the email with the updated OTP if needed
      transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to: data.email,
        subject: "OTP Verification",
        text: `Your OTP is: ${generatedOTP}`
      }, (err, info) => {
        if (err) {
          console.log("Error sending email:", err);
        } else {
          console.log("Updated OTP sent successfully. Message ID:", info.messageId);
        }
      });
    } else {
      console.error("Error saving OTP to the database:", error);
    }
  }
};


const resendOtp = (req, res) => {
  console.log('xxxxxxx')
  mailsender(req.session.data)
  console.log('rr')
}

const validateOtp = async (req, res) => {
  try {
    //Combine OTP parts into a single value
    const otpvalue = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
    console.log('Request body:', req.body);
    console.log('OTP parts:', req.body.otp1, req.body.otp2, req.body.otp3, req.body.otp4);
    console.log('Type of OTP parts:', typeof req.body.otp1, typeof req.body.otp2, typeof req.body.otp3, typeof req.body.otp4);

    //Find OTP document for the user's email address
    const otpDoc = await collection2.findOne({ email: req.session.data.email}).sort({ _id: -1 }).limit(1);
    console.log(otpDoc,'recOtpDoc')
    if(!otpDoc) {
      console.log('OTP document not found');
      return res.render('user/otp.ejs',{message:'OTP not found. Please request a new OTP.'})
    }
    console.log('entered otp', otpvalue);
    console.log('stored otp', otpDoc.otp);
    if (otpDoc.otp == otpvalue) {
      // const newuser = await new collection(req.session.data).save();

      const newUser = new collection({
        firstName: req.session.data.firstName,
        lastName: req.session.data.lastName,
        email: req.session.data.email,
        password: req.session.data.password,
        mobileNumber: req.session.data.mobileNumber,
        wallet: {
          balance: 0,
          transactions: []
        }
      });
      // Credit the referred user's wallet with ₹100 if referral code is provided
      if (req.session.data.referalCode) {
        // Find the user with the provided referral code
        const referrer = await collection.findOne({ referalCode: req.session.data.referalCode });
        if (referrer) {
          // Initialize wallet if not exists
          if (!referrer.wallet) {
            referrer.wallet = {
              balance: 0,
              transactions: []
            };
          }

          // Credit the referrer's wallet with ₹50
          referrer.wallet.balance += 50;
          referrer.wallet.transactions.push({
            amount: 50,
            description: 'Referral bonus credited',
            date: new Date()
          });
          await referrer.save();

          // Credit the referred user's wallet with ₹100
          // Initialize wallet if not exists
          if (!newUser.wallet) {
            newUser.wallet = {
              balance: 0,
              transactions: []
            };
          }

          newUser.wallet.balance += 100;
          newUser.wallet.transactions.push({
            amount: 100,
            description: 'Referral signup bonus credited',
            date: new Date()
          });
        }
      }

      if (newUser.email === process.env.ADMIN_EMAIL) {
        newUser.isAdmin = true
      }
      // Save the new user to the database
      await newUser.save();
      console.log(newUser,'newUser')

      // Clear session data after all operations that require it are completed
      // req.session.destroy();

      // Redirect to login page after successful registration
      res.redirect('/login?message=Sign up Successful. Please log in.');
    } else {
      console.log('OTP validation failed')
      // Render the OTP page again with an error message
      res.render('user/otp.ejs', { message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('error during otp validation', error);
    // Send error response in case of an exception
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

const login = async (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/home')
  }
  const msg = req.query.message
  res.render('user/login.ejs', { message: msg });
}

const loginpost = async (req, res) => {
  try {
    const check = await collection.findOne({ email: req.body.email })
    //compare hashed password with plain text
    const validPassword = await bcrypt.compare(req.body.password, check.password)
    console.log(req.body.password)
    req.session.user = req.body.email
    if (validPassword) {
      req.session.isLoggedIn = true
      res.redirect('/home')

    } else {
      res.redirect('/login?message=Invalid Credentials')
    }
  }
  catch (error) {
    res.redirect('/login?message=Invalid Credentials')
  }
}
// const aftlan=async(req,res)=>{
//   try{
//     const user = req.session.user;
//     const products = await collection3.find({});

//     res.render('user/newlanding.ejs',{user, data4:products})
//   }catch(err){
//     console.log(err)
//     res.status(500).send('Internal Server Error');
//   }
// }
const home = async (req, res) => {
  try {

    // Check if user session exists
    if (!req.session.user) {
      // If user session does not exist, redirect to login page
      return res.redirect('/login?message=Please log in to access this page');
    }

    const user = req.session.user;
    let query = { isListed: true };

    // Check if there are query parameters for filtering
    if (req.query.query) {
      const searchRegex = { $regex: req.query.query, $options: 'i' };
      const category = await Category.findOne({ name: searchRegex });
      query.$or = [
        { productName: searchRegex },
        // { category: category._id },
        { model: searchRegex },
        { color: searchRegex },
      ];

      // Add category search if category is found
      if (category) {
        query.$or.push({ category: category._id });
      }
    }
    // if (req.query.category) {
    //   query.category = { $regex: req.query.category, $options: 'i' };
    // }
    if (req.query.model) {
      query.model = { $regex: req.query.model, $options: 'i' };
    }
    if (req.query.price) {
      const price = parseFloat(req.query.price);
      query.price = { $lte: price };
    }

    let sortOptions = {};
    if (req.query.sortBy === 'nameAsc') {
      sortOptions = { model: 1 }; // Sort by product name in ascending order
    } else if (req.query.sortBy === 'nameDesc') {
      sortOptions = { model: -1 }; // Sort by product name in descending order
    } else if (req.query.sortBy === 'priceAsc') {
      sortOptions = { price: 1 }; // Sort by price in ascending order
    } else if (req.query.sortBy === 'priceDesc') {
      sortOptions = { price: -1 }; // Sort by price in descending order
    }
    console.log(query.price, 'price')
    console.log(req.query.sortBy, 'sort')

    // Fetch products based on the constructed query
    const products = await collection3.find(query).sort(sortOptions).populate('category');
    // console.log(products);

    res.render('user/newlanding.ejs', { user, data4: products });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

const phones = async (req, res) => {
  try {
    const category = await Category.findOne({ name: { $regex: 'Phones', $options: 'i' } });
    let query = { category: category._id, isListed: true };
    console.log(query)
    // const brands = await collection3.distinct('productName', { category: category._id, isListed: true });
    // console.log(brands, 'brands');
    // const colors = await collection3.distinct('color', { category: category._id, isListed: true });
    // console.log(colors, 'colors');


    // Check if there are query parameters for filtering
    if (req.query.productName) {
      query.productName = { $regex: req.query.productName, $options: 'i' };
    }
    if (req.query.minPrice && req.query.maxPrice) {
      query.price = { $gte: req.query.minPrice, $lte: req.query.maxPrice };
    } else if (req.query.minPrice) {
      query.price = { $gte: req.query.minPrice };
    } else if (req.query.maxPrice) {
      query.price = { $lte: req.query.maxPrice };
    }
    if (req.query.color) {
      query.color = { $regex: req.query.color, $options: 'i' };
    }

    // Sorting logic
    let sortOptions = {};
    if (req.query.sortBy === 'nameAsc') {
      sortOptions = { productName: 1 }; // Sort by product name in ascending order
    } else if (req.query.sortBy === 'nameDesc') {
      sortOptions = { productName: -1 }; // Sort by product name in descending order
    } else if (req.query.sortBy === 'priceAsc') {
      sortOptions = { price: 1 }; // Sort by price in ascending order
    } else if (req.query.sortBy === 'priceDesc') {
      sortOptions = { price: -1 }; // Sort by price in descending order
    }

    // Fetch phones based on the constructed query
    const phonesData = await collection3.find(query).sort(sortOptions);
    console.log(phonesData);
    const brands = await collection3.distinct('productName', query);
    const colors = await collection3.distinct('color', query);

    // Render the phones view with the fetched data
    res.render('user/phones.ejs', { data1: phonesData, brands, colors, category });
  } catch (error) {
    console.error('Error fetching phones:', error);
    res.status(500).send('Internal Server Error');
  }
};


// const phones=async(req,res)=>{
//   try{
//     const data1 =  await collection3.find({category:'Phones',isListed:true})
//     console.log(data1)
//       res.render('user/phones.ejs',{data1})
//   }catch (error) {
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// }

const wearables = async (req, res) => {
  try {
    const category = await Category.findOne({ name: { $regex: 'Wearables', $options: 'i' } });
    let query = { category: category._id, isListed: true };
    console.log(query)

    // Check if there are query parameters for filtering
    if (req.query.productName) {
      query.productName = { $regex: req.query.productName, $options: 'i' };
    }
    if (req.query.minPrice && req.query.maxPrice) {
      query.price = { $gte: req.query.minPrice, $lte: req.query.maxPrice };
    } else if (req.query.minPrice) {
      query.price = { $gte: req.query.minPrice };
    } else if (req.query.maxPrice) {
      query.price = { $lte: req.query.maxPrice };
    }
    if (req.query.color) {
      query.color = { $regex: req.query.color, $options: 'i' };
    }

    // Sorting logic
    let sortOptions = {};
    if (req.query.sortBy === 'nameAsc') {
      sortOptions = { productName: 1 }; // Sort by product name in ascending order
    } else if (req.query.sortBy === 'nameDesc') {
      sortOptions = { productName: -1 }; // Sort by product name in descending order
    } else if (req.query.sortBy === 'priceAsc') {
      sortOptions = { price: 1 }; // Sort by price in ascending order
    } else if (req.query.sortBy === 'priceDesc') {
      sortOptions = { price: -1 }; // Sort by price in descending order
    }

    // Fetch phones based on the constructed query
    const wearablesData = await collection3.find(query).sort(sortOptions);
    const brands = await collection3.distinct('productName', query);
    const colors = await collection3.distinct('color', query);

    // Render the phones view with the fetched data
    res.render('user/wearables.ejs', { data2: wearablesData, brands, colors, category });
  } catch (error) {
    console.error('Error fetching phones:', error);
    res.status(500).send('Internal Server Error');
  }
};

// const wearables=async(req,res)=>{
// try{
//   const data2 =  await collection3.find({category:'Wearables',isListed:true})
//   console.log(data2)
//     res.render('user/wearables.ejs',{data2})
// }catch (error) {
//   console.error(error);
//   res.status(500).send('Internal Server Error');
// }
// }
// const tablets = async (req, res) => {
//   try {
//       // Fetch only the products where isListed is true
//       const data3 = await collection3.find({ category: 'Tablets', isListed: true });
//       res.render('user/tablets.ejs', { data3 });
//   } catch (error) {
//       console.error(error);
//       res.status(500).send('Internal Server Error');
//   }
// };

const tablets = async (req, res) => {
  try {
    const category = await Category.findOne({ name: { $regex: 'Tablets', $options: 'i' } });
    let query = { category: category._id, isListed: true };
    console.log(query)
    // const brands = await collection3.distinct('productName', { category: 'Tablets', isListed: true });
    // Check if there are query parameters for filtering
    if (req.query.productName) {
      query.productName = { $regex: req.query.productName, $options: 'i' };
    }
    if (req.query.minPrice && req.query.maxPrice) {
      query.price = { $gte: req.query.minPrice, $lte: req.query.maxPrice };
    } else if (req.query.minPrice) {
      query.price = { $gte: req.query.minPrice };
    } else if (req.query.maxPrice) {
      query.price = { $lte: req.query.maxPrice };
    }

    // Sorting logic
    let sortOptions = {};
    if (req.query.sortBy === 'nameAsc') {
      sortOptions = { productName: 1 }; // Sort by product name in ascending order
    } else if (req.query.sortBy === 'nameDesc') {
      sortOptions = { productName: -1 }; // Sort by product name in descending order
    } else if (req.query.sortBy === 'priceAsc') {
      sortOptions = { price: 1 }; // Sort by price in ascending order
    } else if (req.query.sortBy === 'priceDesc') {
      sortOptions = { price: -1 }; // Sort by price in descending order
    }

    // Fetch phones based on the constructed query
    const tabletsData = await collection3.find(query).sort(sortOptions);
    const brands = await collection3.distinct('productName', query);
    const colors = await collection3.distinct('color', query);

    // Render the phones view with the fetched data
    res.render('user/tablets.ejs', { data3: tabletsData, brands, colors, category });
  } catch (error) {
    console.error('Error fetching phones:', error);
    res.status(500).send('Internal Server Error');
  }
};
const proddes = async (req, res) => {
  try {

    const user = req.session.user;
    const userId = user._id;
    // Fetch product details based on the product ID from the URL parameter
    const productId = req.params.id; // Assuming the parameter name is "productId"
    const product = await collection3.findById(productId).populate('category'); // Assuming collection3 is your product model
    // console.log(product.image[0])

    // Render the product description page with the fetched product details
    res.render('user/productdescription.ejs', { product, productId, userId });

  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).send('Internal Server Error');
  }
}

const rating = async (req, res) => {
  try {
    const productId = req.params.id;
    // Extract productId, rating, and review from the request body
    const { rating, review } = req.body;

    // Convert rating to a number
    const ratingValue = parseInt(rating);

    // Check if ratingValue is a valid number
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: 'Invalid rating value' });
    }

    // Find the corresponding product in the database
    const product = await collection3.findById(productId);

    // If product not found, return an error response
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Add the rating to the product document
    product.ratings.push(ratingValue);
    product.reviews.push(review);

    // Calculate the average rating and update the product document
    const totalRatings = product.ratings.length;
    const sumOfRatings = product.ratings.reduce((acc, cur) => acc + cur, 0);
    console.log(sumOfRatings, totalRatings)
    const averageRating = Math.floor(sumOfRatings / totalRatings);
    console.log(averageRating);
    // Update the product document with the new average rating
    product.ratings = averageRating;

    // Save the updated product document
    await product.save();

    // Send a success response
    // res.status(200).json({ message: 'Rating and review submitted successfully', product });
    res.render('user/productdescription.ejs', { product, productId });

  } catch (error) {
    console.error('Error submitting rating and review:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const logout = async (req, res) => {
  delete req.session.user;
  delete req.session.isLoggedIn;
  res.render('user/landing.ejs')
}

const forpasmail = async (req, res) => {
  res.render('user/forpasmail.ejs')
}

const forpasmailpost = async (req, res) => {
  const email = req.body.email;
  console.log(email);
  try {
    // Check if email exists in database
    const emailExists = await collection.findOne({ email: req.body.email });
    console.log("emailExists", emailExists)
    if (!emailExists) {
      return res.render('user/forpasmail.ejs', { message: 'Email does not exist' });
    }


    req.session.resetEmail = req.body.email;
    console.log(req.session.resetEmail)

    // Send email with OTP
    mailsender({ email: emailExists.email, session: req.session }); // Pass req and res objects
    // console.log(mailsender(req, res));
    // Redirect to OTP verification page
    res.render('user/forpasotp');
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).send('Internal Server Error');
  }
};


const forpasotp = async (req, res) => {
  res.render('user/forpasotp.ejs')
}
const forpasotppost = async (req, res) => {
  try {
    const { otp } = req.body;
    const { otp: sessionOTP, resetEmail } = req.session;
    if (otp === sessionOTP) {
      res.redirect('/forpasreset');
    }
    else {
      res.render('user/forpasotp.ejs', { message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).send('Internal Server Error');
  }
}

const forpasreset = async (req, res) => {
  res.render('user/forpasreset.ejs')
}

const forpasresetpost = async (req, res) => {
  try {
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const resetEmail = req.session.resetEmail;
    const user = await collection.findOne({ email: resetEmail });
    if (!user) {
      return res.render('user/forpasreset.ejs', { message: 'User not found' });
    }
    await collection.updateOne({ email: resetEmail }, { $set: { password: hashedPassword } });
    req.session.resetEmail = null;
    res.redirect('/login?message=Password reset successfully');
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).send('Internal Server Error');
  }
}

const applyCoupon = async (req, res) => {

  try {
    const couponCode = req.body.couponCode;
    console.log(req.body)
    const user = await collection.findOne({ email: req.session.user });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const coupon = await Coupon.findOne({ code: { $options: 'i', $regex: couponCode.toString().toUpperCase() } });
    console.log(coupon)
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    if (!coupon.isActive) {
      return res.status(404).json({ success: false, message: 'Coupon is not active' });
    }

    
    let cart = await Cart.findOne({ userId: user._id });

    // Calculate the total price of the items in the cart
    let totalPrice = 0;
    for (const item of cart.cartItems) {
      totalPrice += item.price * item.quantity;
    }

    // Check if the coupon discount exceeds the total order price
    if (coupon.discountValue > totalPrice) {
      return res.status(400).json({ success: false, message: 'The coupon discount exceeds the total order price' });
    }

   // Check if the coupon was already applied in any past order
   const appliedCoupon = await Order.findOne({ appliedCoupon: coupon._id, userId: user._id });
   console.log('applied', appliedCoupon)
   if (appliedCoupon) {
     return res.status(400).json({ success: false, message: 'Coupon already applied' });
   }

    cart.coupon = coupon._id;
    await cart.save();
    res.status(200).json({ success: true, message: 'Coupon applied successfully' });

  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const removeCoupon = async (req, res) => {
  try {
    const user = await collection.findOne({ email: req.session.user });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let cart = await Cart.findOne({ userId: user._id });
    cart.coupon = undefined;
    cart.couponDiscount = 0;
    await cart.save();
    res.status(200).json({ success: true, message: 'Coupon removed successfully' });
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }

}

module.exports = { landing, signup, signuppost, mailsender, applyCoupon, removeCoupon, phones, wearables, rating, tablets, home, login, loginpost, validateOtp, resendOtp, proddes, logout, forpasmail, forpasmailpost, forpasotp, forpasotppost, forpasreset, forpasresetpost }