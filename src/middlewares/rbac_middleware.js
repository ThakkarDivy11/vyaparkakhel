const User = require("../models/user.model");
const { commonError } = require("../utils/error");

// RBAC middleware for route protection
exports.requireAuth = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Get clerkId from authenticated request (set by Clerk middleware)
      const clerkId = req.auth?.userId;

      if (!clerkId) {
        return next(commonError.unauthorized());
      }

      // Find user in database
      const user = await User.findOne({ clerkId });

      if (!user) {
        return next(commonError.notFound("User"));
      }

      if (user.isBanned) {
        return next(commonError.forbidden("Your account has been banned"));
      }

      // Check if user has required role
      if (roles.length > 0 && !roles.includes(user.userType)) {
        return next(commonError.forbidden("Insufficient permissions"));
      }

      // Attach user to request for use in controllers
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check resource ownership
exports.checkOwnership = (model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const clerkId = req.auth.userId;

      const resource = await model.findById(resourceId);

      if (!resource) {
        return next(commonError.notFound("Resource"));
      }

      // Allow admin/moderator/manager to access any resource
      if (["admin", "moderator", "manager"].includes(req.user.userType)) {
        return next();
      }

      // Check if user owns the resource
      if (resource.clerkId !== clerkId) {
        return next(
          commonError.forbidden("You don't have access to this resource")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
