const Order = require('../model/cart/ordermodel')
const product = require('../model/admin/productmodel')
const exceljs = require('exceljs');
const PDFDocument = require('pdfkit');
// const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');


const getSalesReport = async (req, res) => {

    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate);

    try {

        const orders = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $ne: 'cancelled' } } },
            {
                $lookup: {
                    from: "usermodels",
                    localField: "userId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$orderItems" },
            // {
            // $lookup: {
            //     from: "addresses",
            //     localField: "shippingAddress",
            //     foreignField: "_id",
            //     as: "shippingAddress",
            //   },
            // },
            {
                $lookup: {
                    from: "productmodels",
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },

            {
                $group: {
                    _id: "$_id",
                    customer: { $first: "$customer" },
                    shippingAddress: { $first: "$shippingAddress" },
                    paymentMethod: { $first: "$paymentMethod" },
                    status: { $first: "$orderStatus" },
                    totalAmount: { $first: "$totalPrice" },
                    createdAt: { $first: "$createdAt" },
                    orderedItems: {
                        $push: {
                            product_name: { $arrayElemAt: ["$productDetails.model", 0] },
                            price: "$orderItems.price",
                            quantity: "$orderItems.quantity",
                            itemTotal: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
                        },
                    },
                },
            },
        ]);

        startDate =
            startDate.getFullYear() +
            "-" +
            ("0" + (startDate.getMonth() + 1)).slice(-2) +
            "-" +
            ("0" + startDate.getUTCDate()).slice(-2);

        endDate =
            endDate.getFullYear() +
            "-" +
            ("0" + (endDate.getMonth() + 1)).slice(-2) +
            "-" +
            ("0" + endDate.getUTCDate()).slice(-2);


        console.log(orders[0])
        res.render('admin/salesreport', { orders, startDate, endDate });
    } catch (err) {
        console.error('Error fetching sales report:', err);
        res.status(500).send('Internal Server Error');
    }
}

// const getSalesReport = async (req, res) => {
//     try {
//       const salesReport = await Order.aggregate([
//         {
//           $match: { orderStatus: { $ne: 'cancelled' } }
//         },
//         {
//           $group: {
//             _id: {
//               year: { $year: '$createdAt' },
//               month: { $month: '$createdAt' },
//               day: { $dayOfMonth: '$createdAt' }
//             },
//             totalSales: { $sum: '$totalPrice' }
//           }
//         },
//         {
//           $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
//         }
//       ]);

//     //   res.json(salesReport);
//     res.render('admin/salesreport', { salesReport });
//     } catch (error) {
//       console.error('Error fetching sales report:', error);
//       res.status(500).json({ message: error.message });
//     }
//   };

const exportToExcel = async (req, res) => {

    let startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate);

    try {

        const orders = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $ne: 'cancelled' } } },
            {
                $lookup: {
                    from: "usermodels",
                    localField: "userId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$orderItems" },

            {
                $lookup: {
                    from: "productmodels",
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },

            {
                $group: {
                    _id: "$_id",
                    customer: { $first: "$customer.firstName" },
                    shippingAddress: { $first: "$shippingAddress" },
                    paymentMethod: { $first: "$paymentMethod" },
                    status: { $first: "$orderStatus" },
                    totalAmount: { $first: "$totalPrice" },
                    createdAt: { $first: "$createdAt" },
                    orderedItems: {
                        $push: {
                            product_name: { $arrayElemAt: ["$productDetails.productName", 0] },
                            model: { $arrayElemAt: ["$productDetails.model", 0] },
                            price: "$orderItems.price",
                            quantity: "$orderItems.quantity",
                            itemTotal: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
                        },
                    },
                },
            },
        ]);



        const workBook = new exceljs.Workbook();
        const worksheet = workBook.addWorksheet("Sales Report");

        worksheet.columns = [
            { header: "Order ID", key: "_id" },
            { header: "Customer", key: "customer" },
            { header: "Product Name", key: "productName" },
            { header: "Model", key: "model" },
            { header: "Price", key: "price" },
            { header: "Quantity", key: "quantity" },
            { header: "Total Amount", key: "totalAmount" },
            { header: "Shipping Address", key: "shippingAddress" },
            { header: "Payment Method", key: "paymentMethod" },
            { header: "Status", key: "status" },
            { header: "Date", key: "createdAt" },
        ];

        orders.forEach((order) => {
            // Format Customer
            order.customer = Array.isArray(order.customer) ? order.customer[0] : '';

            // Loop through each ordered item
            order.orderedItems.forEach((item) => {
                const rowData = {
                    _id: order._id.toString().slice(-7).toUpperCase(),
                    customer: order.customer,
                    productName: item.product_name,
                    model: item.model,
                    price: item.price,
                    quantity: item.quantity,
                    totalAmount: order.totalAmount,
                    shippingAddress: order.shippingAddress,
                    paymentMethod: order.paymentMethod,
                    status: order.status,
                    createdAt: order.createdAt,
                };
                worksheet.addRow(rowData);
            });
        });

        // Apply styles to the table rows (excluding header row)
worksheet.eachRow({ includeEmpty: false, skipHeader: true }, (row, rowNumber) => {
    row.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5E6DE' }, // Light gray color
        };
    });
});

// Apply styles to the header row after setting other row styles
worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3CF696' }, // Light green color
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White font color
});




        res.setHeader(
            "content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet"
        );
        res.setHeader("content-Disposition", "attachment; filename=orders.xlsx");

        return workBook.xlsx.write(res).then(() => {
            res.status(200);
        });



    }
    catch (err) {
        console.log(err)
    }

}


const exportToPdf = async (req, res) => {
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    try {
        const orders = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $ne: 'cancelled' } } },
            {
                $lookup: {
                    from: "usermodels",
                    localField: "userId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "productmodels",
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            {
                $group: {
                    _id: "$_id",
                    orderId: { $first: "$_id" },
                    orderDate: { $first: "$createdAt" },
                    user: { $first: "$customer.firstName" },
                    products: { $push: "$orderItems" },
                    shippingAddress: { $first: "$shippingAddress" },
                    paymentMethod: { $first: "$paymentMethod" },
                    status: { $first: "$orderStatus" },
                    totalAmount: { $first: "$totalPrice" },
                },
            },
            {
                $unwind: "$products"
            },
            {
                $lookup: {
                    from: "productmodels",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "products.productDetails",
                },
            },
            {
                $group: {
                    _id: "$_id",
                    orderId: { $first: "$orderId" },
                    orderDate: { $first: "$orderDate" },
                    user: { $first: "$user" },
                    products: {
                        $push: {
                            productId: "$products.productId",
                            quantity: "$products.quantity",
                            price: "$products.price",
                            productName: { $arrayElemAt: ["$products.productDetails.productName", 0] }
                        }
                    },
                    shippingAddress: { $first: "$shippingAddress" },
                    paymentMethod: { $first: "$paymentMethod" },
                    status: { $first: "$status" },
                    totalAmount: { $first: "$totalAmount" },
                },
            },
        ]);

        // Create a new PDF document
        const doc = new PDFDocument();

        // Set response headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        // Pipe the PDF to the response
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(16).text('Sales Report', { align: 'center', underline: true, lineGap: 10, width: 500 }).moveDown();

        // Add items with numbering
        doc.font('Helvetica');

        orders.forEach((order, index) => {
            doc.text(`Order ${index + 1}`, { width: 100 , align: 'left', lineGap: 10, width: 500, underline: true });
            doc.text(`orderID:${order.orderId} - ${order.orderDate.toDateString()} - User:${order.user}`);

            // Format products as a list
            const productList = order.products.map(item => `Order:${item.productName} - ₹${item.price.toFixed(2)} -(${item.quantity})`).join(', ');
            doc.text(productList);
            // console.log(productList,"productList")
            console.log(order, "order")
            doc.text(`ProductName: ${order.products.map(item => item.productName).join(', ')}`);
            doc.text(`ActualPrice: ${order.products.reduce((total, item) => total + item.price, 0).toFixed(2)}`);
            doc.text(`Quantity: ${order.products.reduce((total, item) => total + item.quantity, 0)}`);
            

            doc.text(`Shipping Address: ${order.shippingAddress}`);
            doc.text(`Payment Method: ${order.paymentMethod}`);
            doc.text(`Order Status: ${order.status}`);
            doc.text(`Payment Status: ${order.paymentStatus}`);
            doc.text(`Order Total: ₹${order.totalAmount}`);
            doc.moveDown();
        });

        // Finalize the PDF
        doc.end();
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
};


// const exportToPdf = async (req, res) => {
//     let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
//     let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
//     startDate.setUTCHours(0, 0, 0, 0);
//     endDate.setUTCHours(23, 59, 59, 999);

//     try {
//         const orders = await Order.aggregate([
//             { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $ne: 'cancelled' } } },
//             {
//                 $lookup: {
//                     from: "usermodels",
//                     localField: "userId",
//                     foreignField: "_id",
//                     as: "customer",
//                 },
//             },
//             { $unwind: "$orderItems" },
//             {
//                 $lookup: {
//                     from: "productmodels",
//                     localField: "orderItems.productId",
//                     foreignField: "_id",
//                     as: "productDetails",
//                 },
//             },
//             {
//                 $group: {
//                     _id: "$_id",
//                     orderId: { $first: "$_id" },
//                     orderDate: { $first: "$createdAt" },
//                     user: { $first: "$customer.firstName" },
//                     products: { $push: "$orderItems" },
//                     shippingAddress: { $first: "$shippingAddress" },
//                     paymentMethod: { $first: "$paymentMethod" },
//                     status: { $first: "$orderStatus" },
//                     totalAmount: { $first: "$totalPrice" },
//                 },
//             },
//             {
//                 $unwind: "$products"
//             },
//             {
//                 $lookup: {
//                     from: "productmodels",
//                     localField: "products.productId",
//                     foreignField: "_id",
//                     as: "products.productDetails",
//                 },
//             },
//             {
//                 $group: {
//                     _id: "$_id",
//                     orderId: { $first: "$orderId" },
//                     orderDate: { $first: "$orderDate" },
//                     user: { $first: "$user" },
//                     products: {
//                         $push: {
//                             productId: "$products.productId",
//                             quantity: "$products.quantity",
//                             price: "$products.price",
//                             productName: { $arrayElemAt: ["$products.productDetails.productName", 0] }
//                         }
//                     },
//                     shippingAddress: { $first: "$shippingAddress" },
//                     paymentMethod: { $first: "$paymentMethod" },
//                     status: { $first: "$status" },
//                     totalAmount: { $first: "$totalAmount" },
//                 },
//             },
//         ]);

//         // Create HTML template for PDF
//         let html = `
//             <html>
//             <head>
//                 <style>
//                     table {
//                         border-collapse: collapse;
//                         width: 100%;
//                     }
//                     th, td {
//                         border: 1px solid #dddddd;
//                         text-align: left;
//                         padding: 8px;
//                     }
//                     th {
//                         background-color: #f2f2f2;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div style= "text-align: center;">
//                 <h1>Sales Report</h1>
//                 </div>
//                 <table>
//                     <tr>
//                         <th>SI No.</th>
//                         <th>Order ID</th>
//                         <th>Order Date</th>
//                         <th>User</th>
//                         <th>Product Name</th>
//                         <th>Quantity</th>
//                         <th>Price</th>
//                         <th>Shipping Address</th>
//                         <th>Payment Method</th>
//                         <th>Status</th>
//                         <th>Total Amount</th>
//                     </tr>`;

//         orders.forEach(order => {
//             order.products.forEach((product,index) => {
//                 html += `
//                     <tr>
//                         <td>${index+1}</td>
//                         <td>${order.orderId}</td>
//                         <td>${order.orderDate.toDateString()}</td>
//                         <td>${order.user}</td>
//                         <td>${product.productName}</td>
//                         <td>${product.quantity}</td>
//                         <td>₹${product.price.toFixed(2)}</td>
//                         <td>${order.shippingAddress}</td>
//                         <td>${order.paymentMethod}</td>
//                         <td>${order.status}</td>
//                         <td>₹${order.totalAmount}</td>
//                     </tr>`;
//             });
//         });

//         html += `
//                 </table>
//             </body>
//             </html>`;

//         // Generate PDF from HTML
//         pdf.create(html).toStream((err, stream) => {
//             if (err) {
//                 console.error('Error generating PDF:', err);
//                 res.status(500).send('Internal Server Error');
//             } else {
//                 res.setHeader('Content-Type', 'application/pdf');
//                 res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
//                 stream.pipe(res);
//             }
//         });

//     } catch (err) {
//         console.error('Error fetching sales report:', err);
//         res.status(500).send('Internal Server Error');
//     }
// };


// const exportToPdf = async (req, res) => {
//     let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
//     let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
//     startDate.setUTCHours(0, 0, 0, 0);
//     endDate.setUTCHours(23, 59, 59, 999);

//     try {
//         const orders = await Order.aggregate([
//             { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $ne: 'cancelled' } } },
//             {
//                 $lookup: {
//                     from: "usermodels",
//                     localField: "userId",
//                     foreignField: "_id",
//                     as: "customer",
//                 },
//             },
//             { $unwind: "$orderItems" },
//             {
//                 $lookup: {
//                     from: "productmodels",
//                     localField: "orderItems.productId",
//                     foreignField: "_id",
//                     as: "productDetails",
//                 },
//             },
//             {
//                 $group: {
//                     _id: "$_id",
//                     orderId: { $first: "$_id" },
//                     orderDate: { $first: "$createdAt" },
//                     user: { $first: "$customer.firstName" },
//                     shippingAddress: { $first: "$shippingAddress" },
//                     paymentMethod: { $first: "$paymentMethod" },
//                     status: { $first: "$orderStatus" },
//                     totalAmount: { $first: "$totalPrice" },
//                     products: {
//                         $push: {
//                             name: { $arrayElemAt: ["$productDetails.model", 0] },
//                             image: { $arrayElemAt: ["$productDetails.image", 0] },
//                             quantity: "$orderItems.quantity",
//                         }
//                     },
//                 },
//             },
//         ]);

//         // Create HTML template for PDF
//         let html = `
//             <html>
//             <head>
//                 <style>
//                     table {
//                         border-collapse: collapse;
//                         width: 100%;
//                     }
//                     th, td {
//                         border: 1px solid #dddddd;
//                         text-align: left;
//                         padding: 8px;
//                     }
//                     th {
//                         background-color: #f2f2f2;
//                     }
//                     tr:nth-child(even) {
//                         background-color: #f9f9f9;
//                     }
//                     .no-border {
//                         border: none !important;
//                     }
//                     thead {
//                         display: table-header-group;
//                     }
//                     @media print {
//                         thead { 
//                             display: table-header-group; 
//                         }
//                     }
//                 </style>
//             </head>
//             <body>
//             <div style="text-align: center; margin-top: 20px;">
//                 <h1>Sales Report</h1>
//                 </div>
//                 <table id="salesTable" class="table table-hover" cellspacing="5" style="background-color: #d8f0dd; margin-top: 60px;">
//                     <tr>
//                         <th style="background-color: #3cf696;">S.No</th>
//                         <th style="background-color: #3cf696;">Order ID</th>
//                         <th style="background-color: #3cf696;">Order Date</th>
//                         <th style="background-color: #3cf696;">Customer</th>
//                         <th style="background-color: #3cf696;">Product Name</th>
//                         <th style="background-color: #3cf696;">Quantity</th>
//                         <th style="background-color: #3cf696;">Shipping Address</th>
//                         <th style="background-color: #3cf696;">Payment Method</th>
//                         <th style="background-color: #3cf696;">Status</th>
//                         <th style="background-color: #3cf696;">Total Amount</th>
//                     </tr>`;

//         // Loop through each order
//         let i = 1;
//         orders.forEach((order, index) => {
//             // Loop through each product in the order
//             order.products.forEach((product, index) => {
//                 if (index === 0) { // Display order details only for the first product
//                     html += `
//                         <tr>
//                             <td style=" background-color: #e5e6de;"rowspan="${order.products.length}">${i++}</td>
//                             <td style=" background-color: #e5e6de;"rowspan="${order.products.length}">${order.orderId.toString().slice(-7).toUpperCase()}</td>
//                             <td  style=" background-color: #e5e6de;"rowspan="${order.products.length}">${order.orderDate.toDateString()}</td>
//                             <td  style=" background-color: #e5e6de;"rowspan="${order.products.length}">${order.user}</td>`;
//                 }
//                 // Display product details
//                 html += `
//                     <td style= " background-color: #e5e6de;">${product.name}</td>
//                     <td style= " background-color: #e5e6de;">${product.quantity}</td>`;
//                 if (index === 0) { // Display order details only for the first product
//                     html += `
//                             <td style=" background-color: #e5e6de;"rowspan="${order.products.length}">${order.shippingAddress}</td>
//                             <td style=" background-color: #e5e6de;"rowspan="${order.products.length}">${order.paymentMethod}</td>
//                             <td style=" background-color: #e5e6de;"rowspan="${order.products.length}">${order.status}</td>
//                             <td style=" background-color: #e5e6de;"rowspan="${order.products.length}">₹${order.totalAmount}</td>
//                         </tr>`;
//                 } else {
//                     html += `</tr>`;
//                 }
//             });
//         });

//         html += `
//                 </table>
//             </body>
//             </html>`;

//         // Generate PDF from HTML
//         pdf.create(html).toStream((err, stream) => {
//             if (err) {
//                 console.error('Error generating PDF:', err);
//                 res.status(500).send('Internal Server Error');
//             } else {
//                 res.setHeader('Content-Type', 'application/pdf');
//                 res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
//                 stream.pipe(res);
//             }
//         });

//     } catch (err) {
//         console.error('Error fetching sales report:', err);
//         res.status(500).send('Internal Server Error');
//     }
// };


module.exports = {
    getSalesReport,
    exportToExcel,
    exportToPdf
}