const collection = require('../model/user/usermodel')
const collection1 = require('../model/admin/categorymodel')
const collection3 = require('../model/admin/productmodel')
const order = require('../model/cart/ordermodel');
const bestSelling = require('../helpers/bestSelling');
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
require('dotenv').config()


const login = (req, res) => {
    try {
        res.render("admin/login.ejs")
    } catch (err) {
        console.log(err)
    }
}
//     if (!req.session.admin) {
//         res.render("admin/login.ejs")
//     } else {
//         res.redirect('/admin/dashboard')
//     }
// }

const loginpost = (req, res) => {

    // const email = 'admin123@gmail.com'
    // const password = 'admin123'

    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD

    if (email === req.body.email && password === req.body.password) {
        //adding session 
        req.session.admin = req.body.email;
        // req.session.isAdmin = true;
        console.log(req.session.admin + 'sess')

        // res.redirect('/admin/dashboard')
        // Fetch users collection
        collection.find({}).exec()
            .then(users => {
                // Redirect to admin dashboard
                res.redirect("/admin/dashboard");
            })
            .catch(err => {
                // Handle error if any
                res.send(err);
            });

    } else {
        // res.render('admin/login',{msg:'invalid username or password :('})
        res.render('admin/login.ejs', { wrong: "wrong credentials" });
        //res.send("wrong data....")
    }
}

const dashboard = async (req, res) => {
    const locals = {
        title: "R.M.HUB - Dashboard",
    };

    try {
        // Fetch all users and products
        const users = await collection.find();
        const products = await collection3.find();

        // Count users and products
        const usersCount = await collection.countDocuments();
        const productsCount = await collection3.countDocuments();

        // Aggregate delivered orders to get count and total revenue
        const confirmedOrders = await order.aggregate([
            { $match: { orderStatus: "delivered" } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalRevenue: { $sum: "$totalPrice" },
                },
            },
        ]);
        console.log(confirmedOrders, 'Confirmed Orders');

        // Count the number of delivered orders
        const ordersCount = await order.countDocuments({ orderStatus: "delivered" });
        console.log(ordersCount, 'Orders Count');

        // Get best-selling products, brands, and categories
        const bestSellingProducts = await bestSelling.getBestSellingProducts();
        const bestSellingBrands = await bestSelling.getBestSellingBrands();
        const bestSellingCategories = await bestSelling.getBestSellingCategories();

        // Log best-selling products, brands, and categories
        console.log("Best Selling Products:", bestSellingProducts);
        console.log("Best Selling Brands:", bestSellingBrands);
        console.log("Best Selling Categories:", bestSellingCategories);

        // Render the dashboard
        res.render("admin/dashboard", {
            locals,
            users,
            products,
            usersCount,
            ordersCount,
            productsCount,
            bestSellingBrands,
            bestSellingProducts,
            bestSellingCategories,
            totalRevenue: confirmedOrders.length ? confirmedOrders[0].totalRevenue : 0,
            admin: req.session.admin,
        });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.status(500).send("Server Error");
    }
};

const chart = async (req, res) => {
    try {

        let timeBaseForSalesChart = req.query.salesChart;
        let timeBaseForOrderNoChart = req.query.orderChart;
        let timeBaseForOrderTypeChart = req.query.orderType;
        let timeBaseForCategoryBasedChart = req.query.categoryChart;

        function getDatesAndQueryData(timeBaseForChart, chartType) {
            let startDate, endDate;
            let groupingQuery, sortQuery;

            if (timeBaseForChart === "yearly") {
                startDate = new Date(new Date().getFullYear(), 0, 1);
                endDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

                groupingQuery = {
                    _id: {
                        month: { $month: { $toDate: "$createdAt" } },
                        year: { $year: { $toDate: "$createdAt" } },
                    },
                    totalSales: { $sum: "$totalPrice" },
                    totalOrder: { $sum: 1 },
                };

                sortQuery = { "_id.year": 1, "_id.month": 1 };
            } else if (timeBaseForChart === "weekly") {
                startDate = new Date();
                endDate = new Date();

                startDate.setDate(startDate.getDate() - 6);
                startDate.setUTCHours(0, 0, 0, 0);
                endDate.setUTCHours(23, 59, 59, 999);

                groupingQuery = {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    totalSales: { $sum: "$totalPrice" },
                    totalOrder: { $sum: 1 },
                };

                sortQuery = { _id: 1 };
            } else if (timeBaseForChart === "daily") {
                startDate = new Date();
                endDate = new Date();

                startDate.setUTCHours(0, 0, 0, 0);
                endDate.setUTCHours(23, 59, 59, 999);

                groupingQuery = {
                    _id: {
                        hour: { $hour: { date: "$createdAt" } },
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                    },
                    totalSales: { $sum: "$totalPrice" },
                    totalOrder: { $sum: 1 },
                };

                sortQuery = { "_id.date": 1, "_id.hour": 1 };
            }

            if (chartType === "sales") {
                return { groupingQuery, sortQuery, startDate, endDate };
            } else if (chartType === "orderType") {
                return { startDate, endDate };
            } else if (chartType === "categoryBasedChart") {
                return { startDate, endDate };
            } else if (chartType === "orderNoChart") {
                return { groupingQuery, sortQuery, startDate, endDate };
            }
        }

        const salesChartInfo = getDatesAndQueryData(
            timeBaseForSalesChart,
            "sales"
        );

        const orderChartInfo = getDatesAndQueryData(
            timeBaseForOrderTypeChart,
            "orderType"
        );

        const categoryBasedChartInfo = getDatesAndQueryData(
            timeBaseForCategoryBasedChart,
            "categoryBasedChart"
        );

        const orderNoChartInfo = getDatesAndQueryData(
            timeBaseForOrderNoChart,
            "orderNoChart"
        );

        let salesChartData = await order.aggregate([
            {
                $match: {
                    $and: [
                        {
                            createdAt: {
                                $gte: salesChartInfo.startDate,
                                $lte: salesChartInfo.endDate,
                            },
                            orderStatus: {
                                $nin: ["Cancelled", "Pending", "Failed", "Refunded"],
                            },
                        },
                        {
                            paymentStatus: {
                                $nin: ["pending", "failed", "refunded", "cancelled"],
                            },
                        },
                    ],
                },
            },

            {
                $group: salesChartInfo.groupingQuery,
            },
            {
                $sort: salesChartInfo.sortQuery,
            },
        ]).exec();

        let orderNoChartData = await order.aggregate([
            {
                $match: {
                    $and: [
                        {
                            createdAt: {
                                $gte: orderNoChartInfo.startDate,
                                $lte: orderNoChartInfo.endDate,
                            },
                            orderStatus: {
                                $nin: ["Cancelled", "Failed", "Refunded"],
                            },
                        },
                        {
                            paymentStatus: {
                                $nin: ["pending", "failed", "refunded", "cancelled"],
                            },
                        },
                    ],
                },
            },

            {
                $group: orderNoChartInfo.groupingQuery,
            },
            {
                $sort: orderNoChartInfo.sortQuery,
            },
        ]).exec();

        let orderChartData = await order.aggregate([
            {
                $match: {
                    $and: [
                        {
                            createdAt: {
                                $gte: orderChartInfo.startDate,
                                $lte: orderChartInfo.endDate,
                            },
                            status: {
                                $nin: ["Failed", "Pending", "Cancelled", "Refunded"],
                            },
                        },
                        {
                            paymentStatus: {
                                $nin: ["pending", "failed", "refunded", "cancelled"],
                            },
                        },
                    ],
                },
            },
            {
                $group: {
                    _id: "$paymentMethod",
                    totalOrder: { $sum: 1 },
                },
            },
        ]).exec();

        console.log(orderChartData);

        let categoryWiseChartData = await order.aggregate([
            {
                $match: {
                    $and: [
                        {
                            createdAt: {
                                $gte: categoryBasedChartInfo.startDate,
                                $lte: categoryBasedChartInfo.endDate,
                            },
                            orderStatus: {
                                $nin: ["clientSideProcessing", "cancelled"],
                            },
                        },
                        {
                            paymentStatus: {
                                $nin: ["pending", "failed", "refunded", "cancelled"],
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$orderItems",
            },
            {
                $lookup: {
                    from: "productmodels",
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productInfo",
                },
            },
            {
                $unwind: "$productInfo",
            },
            {
                $replaceRoot: {
                    newRoot: "$productInfo",
                },
            },
            {
                $lookup: {
                    from: "categorymodels",
                    localField: "category",
                    foreignField: "_id",
                    as: "catInfo",
                },
            },
            {
                $addFields: {
                    categoryInfo: { $arrayElemAt: ["$catInfo", 0] },
                },
            },
            {
                $project: {
                    catInfo: 0,
                },
            },
            {
                $addFields: {
                    catName: "$categoryInfo.name",
                },
            },
            {
                $group: {
                    _id: "$catName",
                    count: { $sum: 1 },
                },
            },
        ]).exec();

        let saleChartInfo = {
            timeBasis: timeBaseForSalesChart,
            data: salesChartData,
        };

        let orderTypeChartInfo = {
            timeBasis: timeBaseForOrderTypeChart,
            data: orderChartData,
        };

        let categoryChartInfo = {
            timeBasis: timeBaseForOrderTypeChart,
            data: categoryWiseChartData,
        };

        let orderQuantityChartInfo = {
            timeBasis: timeBaseForOrderNoChart,
            data: orderNoChartData,
        };

        return res
            .status(200)
            .json({
                saleChartInfo,
                orderTypeChartInfo,
                categoryChartInfo,
                orderQuantityChartInfo,
            });
    } catch (err) {
        console.log(err)
        return res.status(500).send('Internal Server Error');
    }

}
const userlist = async (req, res) => {
    try {
        const searchQuery = req.query.search || ''; // Get the search query from the URL or set it to an empty string if not provided

        console.log("Search Query: ", searchQuery); // Log the search query

        // Use a regular expression to perform a case-insensitive search
        const users = await collection.find({
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        });

        console.log("Users: ", users); // Log the users

        res.render('admin/users.ejs', { users, searchQuery });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}


const blockUser = async (req, res) => {
    try {
        // Fetch user from database and toggle their active status
        const user = await collection.findById(req.params.id);
        user.isActive = !user.isActive;
        await user.save();

        // Determine the message based on the new status
        const message = user.isActive ? 'unblocked successfully' : 'blocked successfully';

        // Redirect back to the users list page with a success message
        res.redirect(`/admin/users?successMessage=User ${message}`);
    } catch (err) {///////
        console.error(err);
        res.redirect('/error');
    }
}

const products = async (req, res) => {
    try {
        const product = await collection3.find({}).populate('category')
        console.log(product[0])

        const successMessage = req.query.successMessage;
        res.render('admin/products.ejs', { product, successMessage })
        console.log(product)

    } catch (err) {
        res.status(500).json({ message: err.message })
        console.log('ERROR')
    }
}
const addproducts = async (req, res) => {
    try {
        const categories = await collection1.find({ isListed: true });
        res.render('admin/addproducts.ejs', { categories });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const addproductspost = async (req, res) => {
  try {
    const { productName, price, model, description, color, availableStock, category } = req.body;
    const files = req.files || [];

    if (!productName || !price || !model || !description || !availableStock || !category || files.length === 0) {
      const categories = await collection1.find({ isListed: true });
      return res.render("admin/addproducts.ejs", { error: "All fields are required.", categories });
    }

    const uploadResults = await Promise.all(
      files.map((file) =>
        uploadBufferToCloudinary(file.buffer, {
          folder: "RMHUB_products",
          resource_type: "image",
        })
      )
    );

    const uploadedImages = uploadResults.map((r) => r.secure_url);

    const newProduct = new collection3({
      productName,
      price,
      model,
      description,
      availableStock,
      image: uploadedImages,
      category,
      color,
    });

    await newProduct.save();

    const productMgm = await collection3.find({}).populate("category");
    const categories = await collection1.find({ isListed: true });

    return res.render("admin/products.ejs", {
      product: productMgm,
      categories,
      successMessage: "Product added successfully",
    });
  } catch (error) {
    console.error("Error adding product:", error);
    const categories = await collection1.find({ isListed: true });
    return res.render("admin/addproducts.ejs", { error: "An error occurred while adding the product.", categories });
  }
};

const editproducts = async (req, res) => {
    try {
        const categories = await collection1.find({ isListed: true })
        const productId = req.params.id;
        const product = await collection3.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('admin/editproduct.ejs', { product, categories });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const editproductspost = async (req, res) => {
  try {
    const productId = req.params.id;
    const { productName, price, model, description, availableStock, category, color } = req.body;
    const files = req.files || [];

    const product = await collection3.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Keep images that the UI says to keep
    let keepImages = [];
    if (Array.isArray(req.body.existingImages)) keepImages = req.body.existingImages;
    else if (req.body.existingImages) keepImages = [req.body.existingImages];

    // Upload any newly selected images
    let newImages = [];
    if (files.length > 0) {
      const uploadResults = await Promise.all(
        files.map((file) =>
          uploadBufferToCloudinary(file.buffer, {
            folder: "RMHUB_products",
            resource_type: "image",
          })
        )
      );
      newImages = uploadResults.map((r) => r.secure_url);
    }

    const finalImages = [...keepImages, ...newImages];
    if (finalImages.length === 0) {
      return res.status(400).json({ message: "At least one image is required." });
    }

    product.productName = productName;
    product.price = price;
    product.model = model;
    product.description = description;
    product.availableStock = availableStock;
    product.category = category;
    product.color = color;
    product.image = finalImages;

    await product.save();

    const productList = await collection3.find({}).populate("category");
    return res.render("admin/products.ejs", { product: productList, successMessage: "Product Updated Successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const delproducts = async (req, res) => {
    try {
        const productId = req.params.id.toString().trim();

        // Find the product by ID and update its status to 'SoftDeleted'
        const product = await collection3.findByIdAndDelete(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }
        // Redirect to the products page after successfully soft deleting the product
        res.redirect('/admin/products?successMessage=Product Deleted');
        // res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const toggleProductStatus = async (req, res) => {
    try {
        const productId = req.params.id.trim();

        // Find the product by ID
        const product = await collection3.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Toggle the isListed field
        product.isListed = !product.isListed;

        // Save the updated product
        await product.save();

        // Redirect to the products page after successfully toggling the product status
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const toggleCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.id.trim();
        //find category by id
        const category = await collection1.findById(categoryId)

        if (!category) {
            return res.status(404).send('Category not found');
        }
        //toogle the isListed field
        category.isListed = !category.isListed;
        //update the database with new information
        await category.save();

        res.redirect('/admin/category')
    } catch {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}
const category = async (req, res) => {
    try {
        const categories = await collection1.find({})
        const successMessage = req.query.successMessage;
        res.render('admin/category.ejs', { categories, successMessage })
    } catch (err) {
        res.status(500).json({ message: err.message })
        console.log("ERROR");
    }
}
const addcategory = async (req, res) => {
    res.render('admin/addcategory.ejs')
}
const addcategorypost = async (req, res) => {

    const categoryName = req.body.name.trim(); // Remove leading and trailing spaces

    // Check if the category name contains only spaces
    if (!categoryName.replace(/\s/g, '').length) {
        return res.render('admin/addcategory', { exists: "*Category name cannot be empty or contain only spaces" });
    }

    const category = {
        name: categoryName,
    }

    const existingcategory = await collection1.findOne({ name: category.name })
    console.log(existingcategory)
    if (existingcategory) {
        return res.render('admin/addcategory', { exists: "*Category Already Exists" });
    }

    await collection1.insertMany(category);
    return res.redirect('/admin/category?successMessage=Category Added Successfully');

}

const editcategory = async (req, res) => {

    try {
        const categoryid = req.params.id;
        console.log(categoryid);
        const category = await collection1.findById(categoryid)
        console.log(category);
        res.render('admin/editcategory.ejs', { category })
    } catch (error) {
        console.log(error);
    }
}
const editcategorypost = async (req, res) => {
    try {
        const categoryid = req.params.id;
        const category = await collection1.findById(categoryid);

        if (!category) {
            return res.status(404).send('Category not found');
        }

        const newName = req.body.name.trim();

        // Check if the new name is empty or contains only spaces
        if (!newName.replace(/\s/g, '').length) {
            return res.render('admin/editcategory', { category, exists: "*Category name cannot be empty or contain only spaces" });
        }

        // Check if the new name is the same as the current name
        if (category.name === newName) {
            return res.redirect("/admin/category?successMessage=Category Updated Successfully");
        }

        // Check if there is any category with the new name in the database
        const existingCategory = await collection1.findOne({ name: newName });

        // If an existing category with the new name is found, render the edit category page with an error message
        if (existingCategory && existingCategory._id.toString() !== categoryid) {
            return res.render('admin/editcategory.ejs', { category, error: '*Category already exists', exists: "*Category already exists" });
        }

        category.name = newName;
        await category.save();

        res.redirect("/admin/category?successMessage=Category Updated Successfully");
    } catch (error) {
        console.log(error);
    }
};

const orders = async (req, res) => {

    try {

        const orderStatusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

        // Query the database to retrieve orders
        const orders = await order.find().populate('orderItems.productId').populate({ path: 'userId', populate: { path: 'address' } }).exec();
        const user = await collection.find({});

        const returnRequests = await order.find({ returnRequest: { $exists: true, $ne: null }, orderStatus: "delivered" }).populate('orderItems.productId').populate({ path: 'userId', populate: { path: 'address' } }).sort({ createdAt: -1 }).limit(5)// Sort by createdAt field in descending order})


        // Render the order list template and pass the orders data
        res.render('admin/order.ejs', { orders, user, orderStatusOptions, returnRequests });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
}

const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('order', orderId);
        const { status } = req.body;

        const orderStatusOptions = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

        // Find the order by ID and update its status
        const updatedOrder = await order.findByIdAndUpdate(orderId, { orderStatus: status }, { new: true });

        const returnRequests = await order.find({ returnRequest: { $exists: true, $ne: null }, orderStatus: "delivered" }).populate('orderItems.productId').populate({ path: 'userId', populate: { path: 'address' } }).sort({ createdAt: -1 })// Sort by createdAt field in descending order


        if (!updatedOrder) {
            // If no order is found with the given ID, respond with an error
            return res.status(404).send('Order not found');
        }

        // Respond with a success message or render the page with a success alert
        const orders = await order.find().populate('orderItems.productId').populate({ path: 'userId', populate: { path: 'address' } }).exec();
        const user = await collection.find({});
        res.render('admin/order.ejs', { orders, user, orderStatusOptions, successMessage: 'Order status updated successfully', returnRequests });
    } catch (error) {
        // If an error occurs, respond with a 500 Internal Server Error
        console.error('Error updating order status:', error);
        res.status(500).send('Internal Server Error');
    }
};


const delcategory = async (req, res) => {
    try {
        const del = req.params.id.toString().trim();

        await collection1.findByIdAndDelete(del);
        // Redirect to the category page with success message
        res.redirect('/admin/category?successMessage=Category Deleted');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}

const orderreturn = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Fetch the specific order by its ID
        const order = await order.findById(orderId);

        // Check if the order exists and has a return request
        if (!order || !order.returnRequest) {
            return res.status(404).send('Order or return request not found');
        }

        // Extract return request details from the order
        const { reason, status } = order.returnRequest;

        // Pass the return request details to the order page template
        res.render('admin/order.ejs', { order, reason, status });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}


const logout = async (req, res) => {
    console.log('Session before logout:', req.session);
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
        }
        res.redirect('/admin/login')
    })
}

const approveReturnRequest = async (req, res) => {


    try {
        const orderId = req.params.id;

        // Find the order by ID
        const foundOrder = await order.findById(orderId);

        // Check if the order exists
        if (!foundOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        let totalAmountSpent = 0;
        for (const item of foundOrder.orderItems) {
            totalAmountSpent += item.quantity * item.price;
        }

        // Check if a coupon was applied
        if (foundOrder.totalPrice !== totalAmountSpent) {
            // Adjust totalAmountSpent if a coupon was applied
            totalAmountSpent = foundOrder.totalPrice;
        }


        const user = await collection.findById(foundOrder.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.wallet.balance += totalAmountSpent;
        user.wallet.transactions.push({
            amount: totalAmountSpent,
            description: 'Refund for returned order',
            date: new Date()
        });

        await user.save();

        // Update order status to 'returned'
        foundOrder.orderStatus = 'returned';

        // Save the updated order
        await foundOrder.save();
        console.log(foundOrder)

        // Respond with success message
        return res.status(200).json({ success: true, message: 'Return request approved and order status updated to returned' });
    } catch (error) {
        // Handle errors
        console.error('Error approving return request:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    login, loginpost, dashboard, chart, userlist, blockUser, products, addproducts, addproductspost, editproducts, editproductspost, delproducts,
    toggleProductStatus, category, addcategory, addcategorypost, editcategory, editcategorypost, toggleCategoryStatus, delcategory, orders, updateOrderStatus, orderreturn, approveReturnRequest, logout
}