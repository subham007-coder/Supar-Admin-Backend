const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// Get contact page data
router.get('/', async (req, res) => {
  try {
    const contactData = await Contact.findOne();
    if (!contactData) {
      // Return default data if none exists
      return res.json({
        header: {
          title: "Contact",
          subtitle: "Get in touch with us"
        },
        formSection: {
          heading: "Keep Connected",
          subheading: "Get in Touch – Reach Out to Us",
          description: "Mattis at dolor et ullamcorper vel vel venenatis ex ac praesent vitae. Conubia egestas porta per maximus sem congue! Vulputate tristique interdum consectetur mollis nulla etiam quam lacinia molestie. Class a vestibulum amet."
        },
        formImage: "https://wdtmakehub.wpengine.com/wp-content/uploads/2025/03/h1-deco-bg-img.png",
        form: {
          reasons: [
            "General Inquiry",
            "Product Support",
            "Booking Appointment",
            "Wholesale Query",
            "Other"
          ],
          privacyPolicyText: "Agree To Our Friendly Privacy Policy"
        },
        contactInfo: [
          {
            icon: "mail",
            title: "Mail Us",
            items: ["info@example.com", "support@example.com"]
          },
          {
            icon: "phone",
            title: "Call Us",
            items: ["+000 - 123456789", "+000 - 123456789"]
          },
          {
            icon: "chat",
            title: "Chat with Us",
            items: ["+00-123-456789", "+00-123-456789"]
          },
          {
            icon: "location",
            title: "We are located at",
            items: ["No: 58 A, East Madison Street", "Baltimore, MD, USA 4508"]
          }
        ],
        formLabels: {
          fullName: "Full Name *",
          contactNumber: "Contact Number *",
          email: "Email Address *",
          reasonLabel: "Select Enquiry Reason *",
          message: "Message"
        }
      });
    }
    res.json(contactData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update contact page data
router.put('/', async (req, res) => {
  try {
    const contactData = await Contact.findOne();
    
    if (contactData) {
      const updatedContact = await Contact.findByIdAndUpdate(
        contactData._id,
        req.body,
        { new: true }
      );
      res.json(updatedContact);
    } else {
      const newContact = new Contact(req.body);
      const savedContact = await newContact.save();
      res.status(201).json(savedContact);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update specific section
router.patch('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const contactData = await Contact.findOne();
    
    if (!contactData) {
      return res.status(404).json({ message: 'Contact page data not found' });
    }

    contactData[section] = req.body;
    const updatedContact = await contactData.save();
    
    res.json(updatedContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


module.exports = router;