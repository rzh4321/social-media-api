const multer = require('multer');

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16 MB
  },
  fileFilter (req, file, cb) {
    // Only allow jpeg and jpg files
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}).single('image');

module.exports = uploadImage;