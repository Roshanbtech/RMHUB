const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: { // ID of the user who owns the address
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addressLineOne: {
        type: String,
        required: true
    },
    addressLineTwo: {
        type: String
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{6}$/.test(v); // Validates pincode to be 6 digits
            },
            message: props => `${props.value} is not a valid pincode!`
        }
    },
    addressType: {
        type: String,
        enum: ['Home', 'Work'],
        required: true
    },
}, {
    timestamps: true // Adds createdAt and updatedAt fields to the schema
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
