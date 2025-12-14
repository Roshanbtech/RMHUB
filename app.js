const express = require("express");
const app = express();
const path = require("path");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const cartRouter = require("./routes/cart");
const profileRouter = require("./routes/profile");
const wishlistRouter = require("./routes/wishlist");
const couponRouter = require("./routes/coupon");
const paymentRouter = require("./routes/payment");

const session = require("express-session");
const cookieParser = require('cookie-parser');
const nocache = require('nocache');
const MongoStore = require('connect-mongo');

const oneday = 1000 * 60 * 60 * 24; //one day in milliseconds

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = statusMessages[statusCode] || 'Internal Server Error';
  res.status(statusCode).send(message);
});

app.use(cookieParser()); // Parse cookies before using express-session

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-Secret-Key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: oneday },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/RHUB',
    ttl: 1 * 24 * 60 * 60, // Session will expire in 1 day (seconds)
  })
}));


app.use(express.json());//convert to json
app.use(express.urlencoded({ extended: false }));
app.use(nocache()); // use destroy cache
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))
// app.use('/uploads', express.static("uploads"));
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

app.use('/', userRouter)//to user
app.use("/admin", adminRouter)//to admin
app.use('/cart', cartRouter)//to cart
app.use('/profile', profileRouter)//to profile
app.use('/wishlist', wishlistRouter)//to wishlist
app.use('/coupon', couponRouter)//to coupon
app.use('/payment', paymentRouter)//to payment

const server = app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down successfully.');
    process.exit(0);
  });
});