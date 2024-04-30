const Banner = require('../model/admin/bannermodel');
const multer = require('multer');


const banners = async (req, res) => {
    try {
        const banners = await Banner.find({});
        res.render('admin/banner.ejs', { banners });
    } catch (error) {
        console.log("Error in fetching banners:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const addBanners = async (req, res) => {
    res.render('admin/addbanner.ejs');
};

const addBannersPost = async (req, res) => {
    try {
        const { bannerName, bannerImage, bannerLink, bannerDescription } = req.body;

        // Create a new instance of Banner model
        const banner = new Banner({
            bannerName,
            bannerImage,
            bannerLink,
            bannerDescription
        });

        // Save the banner to the database
        await banner.save();

        // Redirect to the banners list page
        res.redirect('/admin/banners');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};


module.exports = {
    banners,
    addBanners,
    addBannersPost
};
