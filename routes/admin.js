var express = require('express')
var router = express.Router()
const admincontroller = require('../controller/admincontroller')
const offercontroller = require('../controller/offercontroller')
const reportcontroller = require('../controller/reportcontroller')
const bannercontroller = require('../controller/bannercontroller');

const upload = require('../middleware/multer');
const isAdminAuthenticated = require('../middleware/authorizeAdmin');


router.get('/login', isAdminAuthenticated, admincontroller.login)
router.post('/login', isAdminAuthenticated, admincontroller.loginpost)
router.get('/dashboard', isAdminAuthenticated, admincontroller.dashboard)
router.get('/chart', isAdminAuthenticated, admincontroller.chart)
router.get('/users', isAdminAuthenticated, admincontroller.userlist)
router.post('/blockUser/:id', isAdminAuthenticated, admincontroller.blockUser)
router.get('/products', isAdminAuthenticated, admincontroller.products)
router.get('/addproducts', isAdminAuthenticated, admincontroller.addproducts)
router.post('/addproducts', isAdminAuthenticated, upload.array('image', 12), admincontroller.addproductspost)
router.get('/editproducts/:id', isAdminAuthenticated, admincontroller.editproducts)
router.post('/editproducts/:id', isAdminAuthenticated, upload.array('image', 12), admincontroller.editproductspost)
router.post('/toggle-product/:id', isAdminAuthenticated, admincontroller.toggleProductStatus);
router.get('/delproducts/:id', isAdminAuthenticated, admincontroller.delproducts)
router.get('/category', isAdminAuthenticated, admincontroller.category)
router.get('/addcategory', isAdminAuthenticated, admincontroller.addcategory)
router.post('/addcategory', isAdminAuthenticated, admincontroller.addcategorypost)
router.get('/editcategory/:id', isAdminAuthenticated, admincontroller.editcategory)
router.post('/editcategory/:id', isAdminAuthenticated, admincontroller.editcategorypost)
router.post('/toggle-category/:id', isAdminAuthenticated, admincontroller.toggleCategoryStatus);
router.get('/delcategory/:id', isAdminAuthenticated, admincontroller.delcategory)
router.get('/orders', isAdminAuthenticated, admincontroller.orders)
router.post('/updateOrderStatus/:id', isAdminAuthenticated, admincontroller.updateOrderStatus);

router.get('/return/:id', isAdminAuthenticated, admincontroller.orderreturn)
router.post('/approve-return/:id', isAdminAuthenticated, admincontroller.approveReturnRequest)


router.get('/prod-offers', isAdminAuthenticated, offercontroller.prod_offer)
router.get('/prod-details/:id', isAdminAuthenticated, offercontroller.prod_details)
router.post('/prod-offers/:id', isAdminAuthenticated, offercontroller.add_prod_offer)
router.post('/toggle-offer/:id', isAdminAuthenticated, offercontroller.toggle_offer)

router.get('/cat-offers', isAdminAuthenticated, offercontroller.cat_offer)
router.post('/cat-offers/:id', isAdminAuthenticated, offercontroller.add_cat_offer)
router.post('/toggle-cat-offer/:id', isAdminAuthenticated, offercontroller.toggle_cat_offer)
router.get('/cat-details/:id', isAdminAuthenticated, offercontroller.cat_details)

router.get('/sales-report', isAdminAuthenticated, reportcontroller.getSalesReport)
router.get('/excel-salesreport', isAdminAuthenticated, reportcontroller.exportToExcel)
router.get('/pdf-salesreport', isAdminAuthenticated, reportcontroller.exportToPdf)


router.get('/banners', bannercontroller.banners);
router.get('/addbanner', bannercontroller.addBanners);
router.post('/addbanner', upload.array('bannerImage', 5), bannercontroller.addBannersPost);

// router.get('/editbanner/:id',bannercontroller.editbanner)
// router.post('/editbanner/:id',bannercontroller.editbannerpost)
// router.post('/toggle-banner/:id', bannercontroller.toggleBannerStatus);
// router.get('/delbanner/:id',bannercontroller.delbanner)





router.get('/logout', isAdminAuthenticated, admincontroller.logout)



module.exports = router