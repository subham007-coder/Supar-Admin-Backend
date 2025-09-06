const express = require('express');
const router = express.Router();
const InstaPost = require('../models/InstaPost');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all posts
router.get('/', async (req, res) => {
  const posts = await InstaPost.find().sort({ createdAt: -1 });
  res.json(posts);
});

// Add new post
router.post('/', async (req, res) => {
  try {
    const post = new InstaPost(req.body);
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update post
router.put('/:id', async (req, res) => {
  try {
    const post = await InstaPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete post (and image from Cloudinary)
router.delete('/:id', async (req, res) => {
  try {
    const post = await InstaPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Delete image from Cloudinary
    if (post.publicId) {
      try {
        await cloudinary.uploader.destroy(post.publicId);
      } catch (cloudErr) {
        console.error('Cloudinary deletion error:', cloudErr);
      }
    }

    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Image upload endpoint
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'insta-posts' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Cloudinary upload failed' });
  }
});

module.exports = router;