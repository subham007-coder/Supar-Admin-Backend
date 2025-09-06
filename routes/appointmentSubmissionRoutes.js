const express = require('express');
const router = express.Router();
const AppointmentSubmission = require('../models/AppointmentSubmission');

// Create a new appointment
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, service, location, address, appointmentDate, appointmentTime } = req.body;
    const submission = new AppointmentSubmission({
      name,
      email, // <-- Add this
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

// Get all appointments (for admin)
router.get('/', async (req, res) => {
  try {
    const appointments = await AppointmentSubmission.find().sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an appointment
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await AppointmentSubmission.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;