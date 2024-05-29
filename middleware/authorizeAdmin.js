const User = require('../model/user/usermodel');

const isAdminAuthenticated = async (req, res, next) => {
    try {
        //find the user by email in the session
        const user = await User.findOne({ email: req.session.user })

        // Check if the user exists and is an admin
        if (!user || !user.isAdmin) {
            return res.status(403).render('user/error', { message: 'Unauthorized' });
        }

        // If authenticated and isAdmin is true, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error in isAdminAuthenticated middleware:', error);
        res.status(500).render('user/error', { message: 'Internal Server Error' });
    }
};

module.exports = isAdminAuthenticated;