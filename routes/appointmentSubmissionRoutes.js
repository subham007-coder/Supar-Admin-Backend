const express = require('express');
const router = express.Router();
const AppointmentSubmission = require('../models/AppointmentSubmission');
const { isAuth, isAdmin } = require('../config/auth');

// Create a new appointment (requires auth)
router.post('/', isAuth, async (req, res) => {
  try {
    const { name, email, phone, service, location, address, appointmentDate, appointmentTime } = req.body;
    const submission = new AppointmentSubmission({
      user: req.user?._id,
      name,
      email,
      phone,
      service,
      location,
      address,
      appointmentDate,
      appointmentTime
    });
    await submission.save();
    res.status(201).json({ message: 'Appointment booked' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get current user's appointments
router.get('/mine', isAuth, async (req, res) => {
  try {
    const filter = req.user?._id ? { user: req.user._id } : { email: req.user?.email };
    const appointments = await AppointmentSubmission.find(filter).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all appointments (for admin)
router.get('/', isAuth, isAdmin, async (req, res) => {
  try {
    const appointments = await AppointmentSubmission.find().sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update appointment status (admin)
router.put('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    let { status } = req.body;
    if (typeof status === 'string') {
      const map = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', canceled: 'Cancelled' };
      status = map[status.toLowerCase()] || status;
    }
    await AppointmentSubmission.updateOne({ _id: req.params.id }, { $set: { status } }, { runValidators: true });
    res.json({ message: 'Appointment updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an appointment
router.delete('/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const deleted = await AppointmentSubmission.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;