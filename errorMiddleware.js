// src/middleware/errorMiddleware.js
// Centralized error handling middleware.
// Every controller forwards errors here via next(error) so that
// error formatting stays consistent across the whole API.

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle common PostgreSQL error codes explicitly for clearer messages
  if (err.code === '23505') {
    // unique_violation
    statusCode = 409;
    message = 'This record already exists (duplicate entry).';
  } else if (err.code === '23503') {
    // foreign_key_violation
    statusCode = 400;
    message = 'Referenced record does not exist.';
  } else if (err.code === '22P02') {
    // invalid_text_representation (e.g. bad UUID/int cast)
    statusCode = 400;
    message = 'Invalid input format.';
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

// 404 handler for unmatched routes
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFound };
