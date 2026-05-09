class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(errors = []) {
    super('Validation failed', 422);
    this.errors = errors;
  }
}

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  console.error(err);

  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
    ...(err.errors ? { errors: err.errors } : {})
  });
};

module.exports = {
  AppError,
  ValidationError,
  notFound,
  errorHandler
};
