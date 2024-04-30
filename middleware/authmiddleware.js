// authMiddleware.js

const User = require('../model/user/usermodel');

const checkSessionAndBlocked = async (req, res, next) => {
    console.log("Checked sessions");
    if (req.session.user) {
        const userDetails = await User.findOne({ email: req.session.user });
        if (userDetails.isActive) {
            console.log("hello");
            next();
        } else {
            req.session.destroy((err) => {
                if (err) {
                    console.log("Error destroying session: ", err);
                    res.redirect("/login");
                } else {
                    res.redirect('/login?message=Ask your admin for access')
                }
            });
        }
    } else {
        res.redirect("/login");
    }
};

module.exports = { checkSessionAndBlocked };
