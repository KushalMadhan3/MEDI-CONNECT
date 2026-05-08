import { MongoError } from 'mongodb';
import pkg from 'jsonwebtoken';
const { JsonWebTokenError, TokenExpiredError } = pkg;

/**
 * Error handler middleware for Express
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // MongoDB errors
  if (err instanceof MongoError) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        field
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred'
    });
  }

  // JWT Invalid
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'Invalid authentication token'
    });
  }

  // JWT Expired
  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'Authentication token has expired'
    });
  }

  // Custom errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.error || 'An error occurred'
    });
  }

  // Validation errors
  if (err.errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map(e => ({
        field: e.param,
        message: e.msg,
        value: e.value
      }))
    });
  }

  // Default fallback
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    error: `The requested resource ${req.originalUrl} was not found`
  });
}

/**
 * Async wrapper
 */
export function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
