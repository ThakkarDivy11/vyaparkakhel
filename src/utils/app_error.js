class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "Failure" : "Error";
    this.isOperational = true; // use this to send only operational error to client and not programming error

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
