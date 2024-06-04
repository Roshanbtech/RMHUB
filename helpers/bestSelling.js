const Order = require('../model/cart/ordermodel');

module.exports = {

    /**
     * Get the top 5 best-selling products based on delivered order quantities.
     * @returns {Array} List of best-selling products with count, name, and image.
     */
    getBestSellingProducts: async () => {
        try {
            const products = await Order.aggregate([
                { $unwind: "$orderItems" },
                { $match: { orderStatus: "delivered" } },
                { $group: { _id: "$orderItems.productId", count: { $sum: "$orderItems.quantity" } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "productmodels",
                        localField: "_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        productName: { $arrayElemAt: ["$product.model", 0] },
                        productImage: { $arrayElemAt: ["$product.image", 0] }
                    }
                }
            ]);

            console.log(products[0].product, 'products');
            return products;
        } catch (error) {
            console.error('Error fetching best-selling products:', error);
            throw error;
        }
    },

    /**
     * Get the top 10 best-selling brands based on delivered order quantities.
     * @returns {Array} List of best-selling brands with count.
     */
    getBestSellingBrands: async () => {
        try {
            const brands = await Order.aggregate([
                { $unwind: "$orderItems" },
                { $match: { orderStatus: "delivered" } },
                { $group: { _id: "$orderItems.productId", count: { $sum: "$orderItems.quantity" } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "productmodels",
                        localField: "_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        brand: { $arrayElemAt: ["$product.productName", 0] }
                    }
                },
                {
                    $group: {
                        _id: "$brand",
                        count: { $sum: "$count" }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        count: 1
                    }
                }
            ]);

            console.log(brands);
            return brands;
        } catch (error) {
            console.error('Error fetching best-selling brands:', error);
            throw error;
        }
    },

    /**
     * Get the top 10 best-selling categories based on delivered order quantities.
     * @returns {Array} List of best-selling categories with count and category name.
     */
    getBestSellingCategories: async () => {
        try {
            const categories = await Order.aggregate([
                { $unwind: "$orderItems" },
                { $match: { orderStatus: "delivered" } },
                {
                    $lookup: {
                        from: "productmodels",
                        localField: "orderItems.productId",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                { $unwind: "$product" },
                {
                    $group: {
                        _id: "$product.category",
                        count: { $sum: "$orderItems.quantity" }
                    }
                },
                {
                    $lookup: {
                        from: "categorymodels",
                        localField: "_id",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: "$category" },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        categoryName: "$category.name"
                    }
                }
            ]);

            console.log(categories);
            return categories;
        } catch (error) {
            console.error('Error fetching best-selling categories:', error);
            throw error;
        }
    }
};
