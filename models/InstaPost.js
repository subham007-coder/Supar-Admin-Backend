const mongoose = require('mongoose');

const instaPostSchema = new mongoose.Schema({
  image: { type: String, required: true },
  publicId: { type: String, required: true },
  likes: { type: String, required: true },
  comments: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('InstaPost', instaPostSchema);