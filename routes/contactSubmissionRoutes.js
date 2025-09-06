const express = require('express');
const router = express.Router();
const ContactSubmission = require('../models/ContactSubmission');

// Create a new submission
router.post('/', async (req, res) => {
  try {
    const { name, contactNumber, email, reason, message } = req.body;
    const submission = new ContactSubmission({ name, contactNumber, email, reason, message });
    await submission.save();
    res.status(201).json({ message: 'Submission received' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all submissions (for admin)
router.get('/', async (req, res) => {
  try {
    const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a submission by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ContactSubmission.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Submission not found' });
    res.json({ message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;