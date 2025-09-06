const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { getContactData, updateContactData, updateSection } = require('../controllers/contactController');

router.get('/', getContactData);
router.put('/', updateContactData);
router.patch('/:section', updateSection);


module.exports = router;