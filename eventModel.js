// src/models/eventModel.js
// All raw SQL queries related to the "events" table live here.
// Controllers call these functions instead of writing SQL directly.

const pool = require('../config/db');

// Fetch all events, most recently created first
async function getAllEvents() {
  const result = await pool.query(
    'SELECT * FROM events ORDER BY created_at DESC'
  );
  return result.rows;
}

// Search events by name, description, location, or organizer
async function searchEvents(keyword) {
  const likeKeyword = `%${keyword}%`;
  const result = await pool.query(
    `SELECT * FROM events
     WHERE name ILIKE $1
        OR description ILIKE $1
        OR location ILIKE $1
        OR organizer ILIKE $1
     ORDER BY created_at DESC`,
    [likeKeyword]
  );
  return result.rows;
}

// Fetch a single event by its ID
async function getEventById(id) {
  const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  return result.rows[0]; // undefined if not found
}

// Create a new event. available_seats starts equal to capacity.
async function createEvent(eventData) {
  const { name, description, date, time, location, organizer, capacity } =
    eventData;

  const result = await pool.query(
    `INSERT INTO events
      (name, description, date, time, location, organizer, capacity, available_seats)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [name, description, date, time, location, organizer, capacity]
  );
  return result.rows[0];
}

// Delete an event by ID. Returns the deleted row, or undefined if not found.
// Registrations for this event are removed automatically via
// "ON DELETE CASCADE" on the foreign key.
async function deleteEvent(id) {
  const result = await pool.query(
    'DELETE FROM events WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

// Decrease available_seats by 1 for a given event (used inside a transaction)
async function decrementAvailableSeats(client, eventId) {
  const result = await client.query(
    `UPDATE events
     SET available_seats = available_seats - 1
     WHERE id = $1
     RETURNING *`,
    [eventId]
  );
  return result.rows[0];
}

// Increase available_seats by 1 for a given event (used inside a transaction)
async function incrementAvailableSeats(client, eventId) {
  const result = await client.query(
    `UPDATE events
     SET available_seats = available_seats + 1
     WHERE id = $1
     RETURNING *`,
    [eventId]
  );
  return result.rows[0];
}

// Fetch an event by ID using a specific client (used inside a transaction,
// with FOR UPDATE to lock the row and avoid race conditions on seat counts)
async function getEventByIdForUpdate(client, id) {
  const result = await client.query(
    'SELECT * FROM events WHERE id = $1 FOR UPDATE',
    [id]
  );
  return result.rows[0];
}

module.exports = {
  getAllEvents,
  searchEvents,
  getEventById,
  createEvent,
  deleteEvent,
  decrementAvailableSeats,
  incrementAvailableSeats,
  getEventByIdForUpdate,
};
