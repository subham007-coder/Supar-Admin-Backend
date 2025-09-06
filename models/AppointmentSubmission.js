const mongoose = require('mongoose');

const appointmentSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }, // <-- Add this line
  phone: { type: String, required: true },
  service: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AppointmentSubmission', appointmentSubmissionSchema);