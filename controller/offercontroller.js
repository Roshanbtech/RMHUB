const Product = require('../model/admin/productmodel')
const Category = require('../model/admin/categorymodel')





const prod_offer = async (req, res) => {

    const products = await Product.find()
    res.render('admin/offers.ejs', { products })

}
/**
 * Asynchronously fetches product details by ID and responds with the product information.
 *
 * @param {Object} req - The request object containing parameters.
 * @param {Object} res - The response object to send data back.
 * @return {Object} JSON response indicating success and product details or an error message.
 */
const prod_details = async (req, res) => {

    try {
        const product = await Product.findById(req.params.id, {
            model: 1, discount: 1
        })
        res.status(200).json({ success: true, product })
        // res.render('admin/productdetails.ejs',{product})
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal Server Error')
    }
}

const add_prod_offer = async (req, res) => {

    try {
        const product = await Product.findById(req.params.id);
        let discountAmount = 0;
        discountAmount = Math.ceil((product.price * req.body.offerDiscountRate) / 100);

        // Validate the discount rate
        const offerDiscountRate = parseInt(req.body.offerDiscountRate);
        if (offerDiscountRate === 0 || offerDiscountRate > 95) {
            // Show Sweet Alert for invalid discount rate
            return res.status(400).json({ success: false, message: 'Invalid discount rate and should be in a range between 0 - 95' });
        }

        product.offerPrice = product.price - discountAmount;
        product.discount = parseInt(req.body.offerDiscountRate);
        await product.save()
        res.status(200).json({ success: true, product })



    } catch (err) {
        console.log(err)
        res.status(500).send('Internal Server Error')
    }
}

const toggle_offer = async (req, res) => {
    console.log(req.params)
    try {
        const product = await Product.findById(req.params.id).populate('category');
        // const categoryId = req.body.categoryId;

        console.log(product)
        product.onOffer = !product.onOffer;

        // product.category = categoryId;

        await product.save()
        return res.status(200).json({ success: true, message: 'Offer toggled successfully', product });


    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

const cat_offer = async (req, res) => {

    const categories = await Category.find()
    res.render('admin/catoffers.ejs', { categories })
}

const cat_details = async (req, res) => {

    try {
        const category = await Category.findById(req.params.id, {
            name: 1, discount: 1
        })
        res.status(200).json({ success: true, category })
        // res.render('admin/productdetails.ejs',{product})
    } catch (err) {
        console.log(err)
        res.status(500).send('Internal Server Error')
    }
}
const add_cat_offer = async (req, res) => {

    const categoryId = req.params.id;
    const { offerDiscountRate } = req.body;

    // Validation: Check if offerDiscountRate is within the valid range
    if (offerDiscountRate < 0 || offerDiscountRate > 95) {
        return res.status(400).json({ success: false, message: 'Invalid discount rate and should be in a range between 0 - 95' });
    }

    if (!categoryId || !offerDiscountRate) {
        return res.status(400).json({ success: false, message: 'Missing Parameters' });
    }
    if (isNaN(offerDiscountRate) || offerDiscountRate < 0) {
        return res.status(400).json({ success: false, message: 'Invalid Parameters' });
    }



    try {
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.onOffer = true;
        category.offerDiscountRate = offerDiscountRate;
        await category.save();

        // const productsInCategory = await Product.find({ category: category._id });
        // if(!productsInCategory){
        //     return res.status(404).json({ success: false, message: 'Products not found' });
        // }

        const productsInCategory = await Product.find({ category: category._id });
        if (!productsInCategory || productsInCategory.length === 0) {
            return res.status(404).json({ success: false, message: 'Products not found' });
        }

        // for(const product of productsInCategory){
        //     if(!product.onOffer){
        //     const discountAmount = Math.ceil((product.price * offerDiscountRate)/100);

        //     const offerPrice = Math.ceil(product.price - discountAmount);
        //     product.offerDiscountPrice = offerPrice;
        //     product.offerDiscountRate = offerDiscountRate;
        //     product.onOffer = true;

        //     await product.save();
        //     }
        // }
        // return res.status(200).json({ success: true, message: 'Offer added successfully', category });

        for (const product of productsInCategory) {
            const discountAmount = Math.ceil((product.price * offerDiscountRate) / 100);
            const offerPrice = Math.ceil(product.price - discountAmount);

            // Check if the product already has an offer applied individually
            if (!product.onOffer || product.offerPrice > offerPrice) {
                product.offerPrice = offerPrice;
                product.discount = offerDiscountRate;
                product.onOffer = true;
                await product.save();
            }
        }

        return res.status(200).json({ success: true, message: 'Offer added successfully', category });
    } catch (error) {
        console.log(error)
        res.status(500).send('Internal Server Error')
    }
}

const toggle_cat_offer = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        category.onOffer = !category.onOffer;

        const productsInCategory = await Product.find({ category: category._id });
        if (!productsInCategory) {
            return res.status(404).json({ success: false, message: 'Products not found' });
        }

        for (const product of productsInCategory) {

            product.onOffer = category.onOffer;
            let discounntAmount = 0;
            discounntAmount = Math.ceil((product.price * category.offerDiscountRate) / 100);

            const offerPrice = Math.ceil(product.price - discounntAmount);
            product.offerPrice = offerPrice;
            product.discount = category.offerDiscountRate;
            await product.save();

        }
        await category.save()

        return res.status(200).json({ success: true, message: 'Offer toggled successfully', category });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    prod_offer,
    prod_details,
    add_prod_offer,
    toggle_offer,
    cat_offer,
    add_cat_offer,
    toggle_cat_offer,
    cat_details

}