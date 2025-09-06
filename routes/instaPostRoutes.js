const express = require('express');
const router = express.Router();
const InstaPost = require('../models/InstaPost');

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

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const post = await InstaPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;