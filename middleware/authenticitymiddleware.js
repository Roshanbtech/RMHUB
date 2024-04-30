const User = require('../model/user/usermodel');

const isAdminAuthenticated = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.session.user })
        if (!user || !user.isAdmin) {
            // return res.status(403).send('Unauthorized');
            return res.status(403).render('user/error', { message: 'Unauthorized' });

        }
        // If authenticated and isAdmin is true, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error in isAdminAuthenticated middleware:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = isAdminAuthenticated;