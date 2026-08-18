// src/models/registrationModel.js
// All raw SQL queries related to the "registrations" table live here.

const pool = require('../config/db');

// Fetch all registrations, newest first
async function getAllRegistrations() {
  const result = await pool.query(
    'SELECT * FROM registrations ORDER BY registered_at DESC'
  );
  return result.rows;
}

// Fetch all registrations for a specific event
async function getRegistrationsByEventId(eventId) {
  const result = await pool.query(
    'SELECT * FROM registrations WHERE event_id = $1 ORDER BY registered_at DESC',
    [eventId]
  );
  return result.rows;
}

// Fetch a single registration by its ID
async function getRegistrationById(id) {
  const result = await pool.query(
    'SELECT * FROM registrations WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

// Check whether a user has already registered for a specific event
// (used inside a transaction, so it takes the transaction client)
async function findExistingRegistration(client, eventId, userEmail) {
  const result = await client.query(
    'SELECT * FROM registrations WHERE event_id = $1 AND user_email = $2',
    [eventId, userEmail]
  );
  return result.rows[0];
}

// Insert a new registration (used inside a transaction)
async function createRegistration(client, { event_id, user_name, user_email }) {
  const result = await client.query(
    `INSERT INTO registrations (event_id, user_name, user_email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [event_id, user_name, user_email]
  );
  return result.rows[0];
}

// Delete a registration by ID (used inside a transaction)
async function deleteRegistration(client, id) {
  const result = await client.query(
    'DELETE FROM registrations WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

module.exports = {
  getAllRegistrations,
  getRegistrationsByEventId,
  getRegistrationById,
  findExistingRegistration,
  createRegistration,
  deleteRegistration,
};
