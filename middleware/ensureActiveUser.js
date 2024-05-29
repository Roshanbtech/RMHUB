const User = require('../model/user/usermodel');

const checkSessionAndBlocked = async (req, res, next) => {
    try {
        console.log("Checked sessions");

        // Check if session user exists
        if (req.session.user) {
            
            // Find the user by email in the session
            const userDetails = await User.findOne({ email: req.session.user });

            // Check if the user is active
            if (userDetails.isActive) {
                console.log("User is active");
                next();
            } else {
                // Destroy the session if the user is not active
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session: ", err);
                        return res.redirect("/login");
                    } else {
                        return res.redirect('/login?message=Ask your admin for access');
                    }
                });
            }
        } else {
            // Redirect to login if session user does not exist
            return res.redirect("/login");
        }
    } catch (error) {
        console.error('Error in checkSessionAndBlocked middleware:', error);
        res.status(500).render('user/error', { message: 'Internal Server Error' });
    }
};

module.exports = { checkSessionAndBlocked };
