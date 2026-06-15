const AppError = require("./app_error");

// Callable: commonError(statusCode, name, message) — used by controllers
// Also exposes named helpers as properties for legacy call sites.
const commonError = (statusCode, name, message) => {
  const err = new AppError(message || name || "Error", statusCode || 500);
  if (name) err.name = name;
  return err;
};

commonError.invalidData = () => new AppError("Invalid body or data!!", 400);
commonError.invalidUpdate = () => new AppError("No update data provided!!", 400);
commonError.notFound = (resource) => new AppError(`${resource} not found`, 404);
commonError.unauthorized = () => new AppError("Unauthorized access", 401);
commonError.forbidden = () => new AppError("Forbidden", 403);
commonError.serverError = (message = "Internal server error") =>
  new AppError(message, 500);

exports.commonError = commonError;

exports.paymentError = {
  invalidSlug: () => new AppError("Invalid package slug!!", 400),
  noKeyError: () => new AppError("No keys specified for validation!!", 400),
  invalidFields: (missingKeys) =>
    new AppError(`Missing required fields: ${missingKeys.join(", ")}`, 400),
  parseError: () => new AppError("Could not read package data!!", 400),
  subscriptionError: () => new AppError("Could not create subscription!!", 500),
  invalidTransaction: (transactionId) =>
    new AppError(`Transaction with ID ${transactionId} not found`, 404),
  razorpaySignatureError: (error) => new AppError(error, 401),
  payloadError: () => new AppError("Webhook payload is missing!!", 400),
  orderError: (msg) => new AppError(msg, 400),
};
