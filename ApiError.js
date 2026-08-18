// src/utils/ApiError.js
// A small custom error class that lets controllers throw errors
// with a specific HTTP status code. errorMiddleware.js reads
// `statusCode` off the error to build the response.

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
