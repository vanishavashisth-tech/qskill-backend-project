// src/controllers/registrationController.js
// Handles request/response logic for all /api/registrations routes.
// register() and cancelRegistration() run inside PostgreSQL transactions
// so the registration row and the event's available_seats count always
// stay in sync, even if something fails partway through.

const pool = require('../config/db');
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const ApiError = require('../utils/ApiError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/registrations
async function getAllRegistrations(req, res, next) {
  try {
    const registrations = await registrationModel.getAllRegistrations();
    res.status(200).json({
      success: true,
      message: 'Registrations fetched successfully',
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/registrations/event/:eventId
async function getRegistrationsByEvent(req, res, next) {
  try {
    const { eventId } = req.params;

    if (!Number.isInteger(Number(eventId))) {
      throw new ApiError(400, 'Invalid event ID');
    }

    const event = await eventModel.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const registrations = await registrationModel.getRegistrationsByEventId(
      eventId
    );

    res.status(200).json({
      success: true,
      message: 'Registrations for event fetched successfully',
      data: registrations,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/registrations/:id
async function getRegistrationById(req, res, next) {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      throw new ApiError(400, 'Invalid registration ID');
    }

    const registration = await registrationModel.getRegistrationById(id);

    if (!registration) {
      throw new ApiError(404, 'Registration not found');
    }

    res.status(200).json({
      success: true,
      message: 'Registration fetched successfully',
      data: registration,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/registrations
// Steps (all inside one transaction):
//   1. Lock and check that the event exists
//   2. Check that seats are available
//   3. Check that the user has not already registered
//   4. Create the registration
//   5. Decrease available_seats by 1
async function register(req, res, next) {
  const client = await pool.connect();

  try {
    const { event_id, user_name, user_email } = req.body;

    // Basic required-field validation
    const missingFields = [];
    if (event_id === undefined || event_id === null) missingFields.push('event_id');
    if (!user_name) missingFields.push('user_name');
    if (!user_email) missingFields.push('user_email');

    if (missingFields.length > 0) {
      throw new ApiError(
        400,
        `Missing required field(s): ${missingFields.join(', ')}`
      );
    }

    if (!Number.isInteger(event_id)) {
      throw new ApiError(400, 'event_id must be an integer');
    }

    if (!EMAIL_REGEX.test(user_email)) {
      throw new ApiError(400, 'user_email must be a valid email address');
    }

    await client.query('BEGIN');

    // 1. Lock the event row so concurrent registrations can't both
    //    read the same available_seats value (FOR UPDATE)
    const event = await eventModel.getEventByIdForUpdate(client, event_id);

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // 2. Check seat availability
    if (event.available_seats <= 0) {
      throw new ApiError(400, 'No available seats for this event');
    }

    // 3. Check for an existing registration by the same email for this event
    const existingRegistration = await registrationModel.findExistingRegistration(
      client,
      event_id,
      user_email
    );

    if (existingRegistration) {
      throw new ApiError(409, 'This email is already registered for this event');
    }

    // 4. Create the registration
    const registration = await registrationModel.createRegistration(client, {
      event_id,
      user_name,
      user_email,
    });

    // 5. Decrease available_seats by 1
    await eventModel.decrementAvailableSeats(client, event_id);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: registration,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// DELETE /api/registrations/:id
// Steps (all inside one transaction):
//   1. Find the registration
//   2. Delete it
//   3. Increase available_seats by 1
async function cancelRegistration(req, res, next) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      throw new ApiError(400, 'Invalid registration ID');
    }

    await client.query('BEGIN');

    // 1. Delete the registration, returning the deleted row so we know
    //    which event's seat count to update (also confirms it existed)
    const deletedRegistration = await registrationModel.deleteRegistration(
      client,
      id
    );

    if (!deletedRegistration) {
      throw new ApiError(404, 'Registration not found');
    }

    // 3. Increase available_seats by 1 for that event
    await eventModel.incrementAvailableSeats(
      client,
      deletedRegistration.event_id
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      data: deletedRegistration,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  getAllRegistrations,
  getRegistrationsByEvent,
  getRegistrationById,
  register,
  cancelRegistration,
};
