const User = require('../model/user/usermodel');

const isNormalUserAuthenticated = (options = {}) => {
    return async (req, res, next) => {
        try {
            const userEmail = req.session.user;
            if (!userEmail) {
                // User is not logged in
                return res.status(401).render('user/error', { message: 'Unauthorized: User not authenticated' });
            }

            const user = await User.findOne({ email: userEmail });
            if (!user) {
                return res.status(401).render('user/error', { message: 'Unauthorized: User not authenticated' });
            }

            if (user.isAdmin) {
                // Admin user is not authorized for this action
                res.redirect('/admin/dashboard?message=Unauthorized!... This action is not permitted.');
            } else {
                // Normal user, ensure they can only access their own details
                const { compareId = true } = options;
                const userIdFromParams = req.params.id;
                if (compareId && userIdFromParams && userIdFromParams !== user._id.toString()) {
                    // If the request contains a userId parameter and it's not the user's own ID
                    return res.status(403).render('user/error', { message: 'Forbidden: You do not have permission to access this resource' });
                } else {
                    // Proceed to the next middleware
                    req.user = user; // Attach user to request object
                    return next();
                }
            }
        } catch (error) {
            console.error('Error in isNormalUser middleware:', error);
            return res.status(500).render('user/error', { message: 'Internal Server Error' });
        }
    };
}
module.exports = isNormalUserAuthenticated;
