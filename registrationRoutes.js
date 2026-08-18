// src/routes/registrationRoutes.js

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

// IMPORTANT: /event/:eventId must be declared before /:id so that
// "event" is not mistakenly interpreted as an :id value.
router.get('/event/:eventId', registrationController.getRegistrationsByEvent);

router.get('/', registrationController.getAllRegistrations);
router.get('/:id', registrationController.getRegistrationById);
router.post('/', registrationController.register);
router.delete('/:id', registrationController.cancelRegistration);

module.exports = router;
