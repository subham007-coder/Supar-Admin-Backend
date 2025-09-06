const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const Contact = require('../models/Contact');
const { getContactData, updateContactData, updateSection } = require('../controllers/contactController');

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', getContactData);
router.put('/', updateContactData);
router.patch('/:section', updateSection);

// Image upload endpoint (Promise-based)
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'contact-us' },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              console.error("Cloudinary Error:", error);
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ message: err.message || 'Cloudinary upload failed' });
  }
});


module.exports = router;