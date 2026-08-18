// src/controllers/eventController.js
// Handles request/response logic for all /api/events routes.
// Validation and shaping of responses happen here; raw SQL lives in eventModel.js.

const eventModel = require('../models/eventModel');
const ApiError = require('../utils/ApiError');

// GET /api/events
async function getAllEvents(req, res, next) {
  try {
    const events = await eventModel.getAllEvents();
    res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/events/search?keyword=technology
async function searchEvents(req, res, next) {
  try {
    const { keyword } = req.query;

    if (!keyword || keyword.trim() === '') {
      throw new ApiError(400, 'A "keyword" query parameter is required');
    }

    const events = await eventModel.searchEvents(keyword.trim());
    res.status(200).json({
      success: true,
      message: 'Events matching search fetched successfully',
      data: events,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/events/:id
async function getEventById(req, res, next) {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      throw new ApiError(400, 'Invalid event ID');
    }

    const event = await eventModel.getEventById(id);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    res.status(200).json({
      success: true,
      message: 'Event fetched successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/events
async function createEvent(req, res, next) {
  try {
    const { name, description, date, time, location, organizer, capacity } =
      req.body;

    // Basic required-field validation
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!date) missingFields.push('date');
    if (!time) missingFields.push('time');
    if (!location) missingFields.push('location');
    if (!organizer) missingFields.push('organizer');
    if (capacity === undefined || capacity === null) missingFields.push('capacity');

    if (missingFields.length > 0) {
      throw new ApiError(
        400,
        `Missing required field(s): ${missingFields.join(', ')}`
      );
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new ApiError(400, 'Capacity must be a positive integer');
    }

    const newEvent = await eventModel.createEvent({
      name,
      description: description || null,
      date,
      time,
      location,
      organizer,
      capacity,
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: newEvent,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/events/:id
async function deleteEvent(req, res, next) {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      throw new ApiError(400, 'Invalid event ID');
    }

    // Registrations are removed automatically via ON DELETE CASCADE
    const deletedEvent = await eventModel.deleteEvent(id);

    if (!deletedEvent) {
      throw new ApiError(404, 'Event not found');
    }

    res.status(200).json({
      success: true,
      message: 'Event and its registrations deleted successfully',
      data: deletedEvent,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllEvents,
  searchEvents,
  getEventById,
  createEvent,
  deleteEvent,
};
