const User = require('../model/user/usermodel');
const Address = require('../model/profile/addressmodel');
const Order = require('../model/cart/ordermodel');
const bcrypt = require('bcrypt');

const getprofile = async (req, res) => {
  try {
    // Assuming the user's email is stored in req.session.user
    const userEmail = req.session.user;
    // console.log(userEmail)
    if (!userEmail) {
      return res.status(401).send('Unauthorized'); // User is not logged in
    }

    // Find the user in the database using the email
    const user = await User.findOne({ email: userEmail }).populate('address');
    // console.log('user', user)
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Render the profile page with the user data
    res.render('profile/profile.ejs', { user });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};

const addAddressToProfile = async (req, res) => {
  try {
    res.render('profile/address.ejs');
  } catch (error) {
    console.error('Error rendering add address page:', error);
    res.status(500).send('Internal Server Error');
  }
}
const addAddressToProfilepost = async (req, res) => {
  try {
    const { addressLineOne, addressLineTwo, city, state, pincode, addressType } = req.body;

    // Assuming the user's email is stored in req.session.user
    const userEmail = req.session.user;
    if (!userEmail) {
      return res.status(401).send('Unauthorized');
    }

    // Find the user in the database using the email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new address using the address schema
    const newAddress = new Address({
      userId: user._id, // Assuming the Address model has userId field to link it to the user
      addressLineOne,
      addressLineTwo,
      city,
      state,
      pincode,
      addressType
    });

    // Save the address to the database
    await newAddress.save();

    // Assign the ObjectId of the new address directly to the address field
    //  user.address = newAddress._id;

    // Add the new address to the user's list of addresses
    user.address.push(newAddress._id);

    // Save the user document
    await user.save();
    res.redirect('/profile/getprofile?success=Address added successfully');
    // res.status(201).json({ message: 'Address added successfully', address: newAddress });
  } catch (error) {
    console.error('Error adding address to profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const removeAddress = async (req, res) => {
  try {
    const { addressId } = req.params; // Assuming addressId is passed as a route parameter

    // Find the user and remove the address from their list of addresses
    const user = await User.findOneAndUpdate(
      { email: req.session.user }, // Assuming user's email is stored in the session
      { $pull: { address: addressId } }, // Remove the address from the array
      { new: true }
    ).populate('address'); // Populate the address field after update

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Find the removed address and delete it from the database
    const removedAddress = await Address.findByIdAndDelete(addressId);
    if (!removedAddress) {
      return res.status(404).send('Address not found');
    }

    // Redirect or render the profile page with updated user data
    res.redirect('/profile/getprofile?success=Address removed successfully');
  } catch (error) {
    console.error('Error removing address:', error);
    res.status(500).send('Internal Server Error');
  }
};

const editaddress = async (req, res) => {

  try {
    const addressId = req.params.addressId; // Get the address ID from the URL parameter
    if (!addressId) {
      return res.status(400).send('Bad Request');
    }
    // Use the address ID to fetch the address data from the database
    const address = await Address.findById(addressId);
    // Check if address exists
    if (!address) {
      return res.status(404).send('Address not found');
    }
    // Render the edit address page with the retrieved address data
    res.render('profile/editaddress.ejs', { address });
  } catch (error) {
    console.error('Error fetching address for editing:', error);
    res.status(500).send('Internal Server Error');
  }

}

const updateaddress = async (req, res) => {

  try {
    const addressId = req.params.addressId; // Get the address ID from the URL parameter
    if (!addressId) {
      return res.status(400).send('Bad Request');
    }
    // Use the address ID to fetch the address data from the database
    const address = await Address.findById(addressId);
    // Check if address exists
    if (!address) {
      return res.status(404).send('Address not found');
    }


    // Update address data (assuming you have validation logic here)
    address.addressLineOne = req.body.addressLineOne.trim();
    address.addressLineTwo = req.body.addressLineTwo.trim();
    address.city = req.body.city.trim();
    address.state = req.body.state.trim();
    address.pincode = req.body.pincode.trim();
    address.addressType = req.body.addressType;
    // Save the updated address data
    await address.save();
    // Redirect or render the profile page with updated user data
    res.redirect('/profile/getprofile?success=Address updated successfully');
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).send('Internal Server Error');
  }

}


// Define the editprofile function
const editprofile = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the URL parameter
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }
    // Use the user ID to fetch the user's profile data from the database
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Render the edit profile page with the retrieved profile data
    res.render('profile/editprofile.ejs', { user });
  } catch (error) {
    console.error('Error fetching user profile for editing:', error);
    res.status(500).send('Internal Server Error');
  }
};

const updateprofile = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the URL parameter
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    // Use the user ID to fetch the user's profile data from the database
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Validate and sanitize the input data
    const { firstName, lastName } = req.body;

    //check if firstname is empty or contains only space
    if (!firstName.trim()) {
      return res.render('profile/editprofile.ejs', { user, exists: "First name cannot be empty or contain only spaces" });
    }

    //check if lastname is empty or contains only space
    if (!lastName.trim()) {
      return res.render('profile/editprofile.ejs', { user, exists: "Last name cannot be empty or contain only spaces" });
    }
    // Update user data
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();


    // Save the updated user data
    await user.save();

    // Redirect or render the profile page with updated user data
    res.redirect('/profile/getprofile?success= Profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).send('Internal Server Error');
  }
};

const changepassword = async (req, res) => {
  try {
    // Get the user ID from the URL parameter
    const userId = req.params.id; // Get the user ID from the URL parameter
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }
    // Use the user ID to fetch the user's profile data from the database
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Render the change password page with the user ID
    res.render('profile/changepassword.ejs', { user });
  } catch (error) {
    console.error('Error rendering change password page:', error);
    res.status(500).send('Internal Server Error');
  }
};

const updatepassword = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the URL parameter
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    // Use the user ID to fetch the user's profile data from the database
    const user = await User.findById(userId);

    // Check if user exists
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Extract old password, new password, and confirm password from the request body
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.render('profile/changepassword.ejs', { user, exists: "New password and confirm password do not match" });
    }

    // Compare the old password provided by the user with the one stored in the database
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      return res.render('profile/changepassword.ejs', { user, exists: "Old password is incorrect" });
    }

    // Hash the new password before saving it to the database
    const hashedPassword = await bcrypt.hash(newPassword, 10); // Hash the new password with salt rounds of 10

    // Update the user's password with the hashed password
    user.password = hashedPassword;

    // Save the updated user data
    await user.save();

    // Redirect or render the profile page with updated user data
    res.redirect('/profile/getprofile?success=Password changed successfully');
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).send('Internal Server Error');
  }
}

const wallet = async (req, res) => {
  try {
    // Assuming you have stored the user's ID in the session
    const userEmail = req.session.user;
    console.log(userEmail)
    if (!userEmail) {
      return res.status(401).send('Unauthorized'); // User is not logged in
    }

    // Find the user in the database using the email
    const user = await User.findOne({ email: userEmail });
    console.log('user', user)
    if (!user) {
      return res.status(404).send('User not found');
    }

    const latestTransactions = user.wallet.transactions.sort((a, b) => b.date - a.date).slice(0, 10);

    // Extract order information from transactions
    const orderIds = latestTransactions.map(transaction => transaction.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } });
        res.render('profile/wallet.ejs', { user, latestTransactions, orders });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Internal Server Error');
  }
}

const genReferalcode = async (req, res) => {
  try {

    // Generate a random string of 6 characters
    function randomString(length) {
      let result = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
      return result;
    }

    const referalCode = randomString(6);
    // console.log('referalCode', referalCode);


    const userEmail = req.session.user;
    if (!userEmail) {
      return res.redirect('/login');
    }
    // Get the user from the session and update the referal code
    const nameExt = await User.findOne({ email: userEmail });
    if (!nameExt) {
      return res.status(404).send('User not found');
    }
    const user = await User.findById(nameExt._id);
    // console.log('user', user);

    user.referalCode = referalCode;
    await user.save();

    res.redirect('/profile/getprofile');


  } catch (error) {
    console.error('Error generating referal code:', error);
    res.status(500).send('Internal Server Error');
  }
}

module.exports = { getprofile, editprofile, updateprofile, addAddressToProfile, addAddressToProfilepost, removeAddress, editaddress, updateaddress, changepassword, updatepassword, wallet, genReferalcode };
