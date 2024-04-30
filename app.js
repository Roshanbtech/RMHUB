const express = require("express")
const app = express()
const path = require("path")
const userRouter = require("./routes/user")
const adminRouter = require("./routes/admin")
const cartRouter = require("./routes/cart")
const profileRouter = require("./routes/profile")
const wishlistRouter = require("./routes/wishlist")
const couponRouter = require("./routes/coupon")
const paymentRouter = require("./routes/payment")

const session = require("express-session")
const cookieParser = require('cookie-parser');
const nocache = require('nocache');
const multer = require('multer');
const bcrypt = require('bcrypt');
const Swal = require('sweetalert2')
const MongoStore = require('connect-mongo');

//const morgan = require('morgan');

//const flash=require('express-flash');



const oneday = 1000 * 60 * 60 * 24; //one day in seconds



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = statusMessages[statusCode] || 'Internal Server Error';
  res.status(statusCode).send(message);
});


app.use(cookieParser()); // Parse cookies before using express-session

// app.use(session({
//   secret: 'your-Secret-Key',
//   resave: false,
//   cookie: { maxAge: oneday },
//   saveUninitialized: false
// }));//creating session

app.use(session({
  secret: 'your-Secret-Key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: oneday },
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/RHUB',
    ttl: 1 * 24 * 60 * 60, // Session will expire in 1 day (seconds)
  })
}));


//app.use(flash());
app.use(express.json());//convert to json
app.use(express.urlencoded({ extended: false }));
app.use(nocache()); // use destroy cache
//app.use(morgan('combined'));

app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies
app.use(express.json());

app.use((req, res, next) => {
  if (!req.user) {
    res.header('Cache-Control', 'private,no-cache,no-store,must-revalidate')
  }
  next();
})

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

app.set("view engine", "ejs")//seting ejs to view engine
app.set('views', path.join(__dirname, 'view'))

app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static("uploads"));


app.use('/', userRouter)//to user
app.use("/admin", adminRouter)//to admin
app.use('/cart', cartRouter)//to cart
app.use('/profile', profileRouter)//to profile
app.use('/wishlist', wishlistRouter)//to wishlist
app.use('/coupon', couponRouter)//to coupon
app.use('/payment', paymentRouter)//to payment


app.listen(3005, () => {
  console.log("http://localhost:3005");
})//seting port

