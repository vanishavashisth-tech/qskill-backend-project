// src/app.js
// Configures the Express application: middleware, routes, and error handling.
// server.js is responsible for actually starting this app on a port.

const express = require('express');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Simple health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event Management System API is running',
    data: null,
  });
});

// Mount feature routes
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// 404 handler for any route that didn't match above
app.use(notFound);

// Centralized error handler (must be registered last)
app.use(errorHandler);

module.exports = app;
