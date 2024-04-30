const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/RHUB').then(()=>{
    console.log('mongodb had connected');
}).catch(()=>{
    console.log('mongodb has not connected');
});


const bannerSchema = new mongoose.Schema({
    bannerName: {
        type: String,
        required: true
    },
    bannerImage: {
        type: String,
        required: true
    },
    bannerLink: {
        type: String,
        required: true
    },
    bannerDescription: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
