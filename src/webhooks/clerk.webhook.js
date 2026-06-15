const catchAsync = require("../utils/catch_async");
const AppError = require("../utils/app_error");
const userController = require("../controllers/user.controller");
const { verifyWebhook } = require("./utils/verify_webhook_request");
const {
  mapClerkDataToUserModel,
} = require("./utils/map_clerk_data_to_user_model");
const responseHandler = require("../utils/response_handler");

async function handleClerkEvent(payload, req, res, next) {
  try {
    // Extract data and event type
    const eventData = payload.data;
    const eventType = payload.type;

    console.log("Event received:", eventType);

    // Validate event data
    if (!eventData || !eventData.id) {
      throw new AppError("Invalid webhook payload: missing data or id", 400);
    }

    // Map Clerk data to our user model
    const userData = mapClerkDataToUserModel(eventData);

    // Create modified request objects for the controllers
    const modifiedReq = {
      ...req,
      body: { data: userData },
      params: { clerkId: eventData.id },
    };

    switch (eventType) {
      case "user.created":
        return await userController.createUser(modifiedReq, res, next);

      case "user.updated":
        return await userController.updateUserByClerkId(modifiedReq, res, next);

      case "user.deleted":
        return await userController.deleteUserByClerkId(modifiedReq, res, next);

      case "session.created":
        await handleSessionCreated(eventData);
        return responseHandler(res, "Session created event processed", 200);

      case "session.ended":
        await handleSessionEnded(eventData);
        return responseHandler(res, "Session ended event processed", 200);

      case "session.revoked":
        await handleSessionRevoked(eventData);
        return responseHandler(res, "Session revoked event processed", 200);

      default:
        console.log(`Unhandled event type: ${eventType}`);
        return responseHandler(
          res,
          `Event ${eventType} received but not processed`,
          200
        );
    }
  } catch (err) {
    console.error("Error handling Clerk event:", err);
    next(err);
  }
}

// Session event handlers
const handleSessionCreated = async (sessionData) => {
  try {
    const user = await User.findOne({ clerkId: sessionData.user_id });
    if (user) {
      user.isLoggedIn = true;
      user.metadata.set("lastLogin", new Date().toISOString());
      await user.save();
    }
  } catch (error) {
    console.error("Error handling session created:", error);
  }
};

const handleSessionEnded = async (sessionData) => {
  try {
    const user = await User.findOne({ clerkId: sessionData.user_id });
    if (user) {
      user.isLoggedIn = false;
      user.metadata.set("lastLogout", new Date().toISOString());
      await user.save();
    }
  } catch (error) {
    console.error("Error handling session ended:", error);
  }
};

const handleSessionRevoked = async (sessionData) => {
  try {
    const user = await User.findOne({ clerkId: sessionData.user_id });
    if (user) {
      user.isLoggedIn = false;
      user.metadata.set("lastLogout", new Date().toISOString());
      await user.save();
    }
  } catch (error) {
    console.error("Error handling session revoked:", error);
  }
};

const clerkWebhookController = catchAsync(async (req, res, next) => {
  try {
    const payload = verifyWebhook(req);
    await handleClerkEvent(payload, req, res, next);
  } catch (error) {
    console.error("Webhook verification failed:", error);
    next(new AppError("Webhook verification failed", 401));
  }
});

module.exports = clerkWebhookController;
