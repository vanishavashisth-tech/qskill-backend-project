// src/routes/eventRoutes.js

const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// IMPORTANT: /search must be declared before /:id so that
// "search" is not mistakenly interpreted as an :id value.
router.get('/search', eventController.searchEvents);

router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);
router.post('/', eventController.createEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
