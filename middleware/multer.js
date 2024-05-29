const multer = require('multer');
const fs = require('fs');
const path = require('path');

//Ensure our uploads directory exists...
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //Set the destination directory for uploaded files
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    //Prepend the current timestamp to original filename
    return cb(null, `${Date.now()}-${file.originalname}`);
  }
})

//Create the upload middleware with the storage configuration
const upload = multer({ storage })

module.exports = upload
