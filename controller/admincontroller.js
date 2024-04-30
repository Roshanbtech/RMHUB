const collection = require('../model/user/usermodel')
const collection1 = require('../model/admin/adminmodel')
const collection3 = require('../model/admin/productmodel')
const order = require('../model/cart/ordermodel');
require('dotenv').config()


const login = (req, res) => {
    try{
        if (!req.session.admin) {
            res.render("admin/login.ejs")
        } else {
            res.redirect('/admin/dashboard')
        }
    }catch(err){
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

const dashboard = (req, res) => {
    //console.log(req.session.admin+'s')
    if (!req.session.admin) {
        res.render('admin/login.ejs')
    } else {
        res.render('admin/dashboard.ejs')
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

        // Redirect back to the users list page
        res.redirect('/admin/users');
    } catch (err) {
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
    const { productName, price, model, description, shape, color, availableStock, category } = req.body;
    const productImg = req.files;

    // Validate input fields
    if (!productName || !price || !model || !description || !availableStock || !category || !productImg) {
        return res.render('admin/addproducts.ejs', { error: 'All fields are required.' });
    }

   
    // Other validation checks for each field can be added here

    
    try {

        const existingProducts = await collection3.findOne({ model});
        console.log(existingProducts, 'existingProducts')
        if (existingProducts) {
            // const successMessage = req.query.successMessage;
            const categories = await collection1.find({ isListed: true });
            return res.redirect('/admin/addproducts?successMessage=Product model already exists.');
            // res.render('admin/addproducts.ejs', { error: 'Product model already exists.', categories, successMessage });
        }
    
        // Create a new product instance
        const newProduct = new collection3({
            productName,
            price,
            model,
            description,
            availableStock,
            image: productImg.map(image => image.path),
            category,
            shape,
            color
        });

        // Save the product to the database
        await newProduct.save();

        // Fetch all products after adding the new one
        const productMgm = await collection3.find({});
        const categories = await collection1.find({ isListed: true }); // Fetch categories again


        res.render('admin/products.ejs', { product: productMgm, categories, successMessage: "Product added successfully" });
    } catch (error) {
        console.error('Error adding product:', error);
        const categories = await collection1.find({ isListed: true });

        res.render('admin/addproducts.ejs', { error: 'An error occurred while adding the product.', categories });
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
        const { productName, price, rating, model, description, availableStock, category, shape, color } = req.body;
        const productImg = req.files;
        const product = await collection3.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Update product details
        product.productName = productName;
        product.price = price;
        product.model = model;
        product.description = description;
        product.availableStock = availableStock;
        product.image = productImg.map(image => image.path);
        product.category = category;
        product.shape = shape;
        product.color = color;
        // Save the updated product
        const updatedProduct = await product.save();
        // Redirect to the products page with the updated product list
        const productList = await collection3.find({});
        res.render('admin/products.ejs', { product: productList, successMessage: 'Product Updated Successfully' });
        // res.redirect('/admin/products?successMessage=Product Updated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
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
    login, loginpost, dashboard, userlist, blockUser, products, addproducts, addproductspost, editproducts, editproductspost, delproducts,
    toggleProductStatus, category, addcategory, addcategorypost, editcategory, editcategorypost, toggleCategoryStatus, delcategory, orders, updateOrderStatus, orderreturn, approveReturnRequest, logout
}