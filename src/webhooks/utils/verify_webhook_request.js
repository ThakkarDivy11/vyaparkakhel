const { Webhook } = require("svix");
const AppError = require("../../utils/app_error");
const config = require("../../config/config");

const env = process.env.NODE_ENV || "development";

exports.verifyWebhook = (req) => {
  const SIGNING_SECRET = config[env].server_conn.clerk.signingSecret;

  if (!SIGNING_SECRET) {
    throw new AppError(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env",
      400
    );
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers and body
  const { headers } = req;
  // Get the payload
  const payload = req.rawBody || JSON.stringify(req.body);

  // Get Svix headers for verification
  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];

  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError("Error: Missing svix headers", 400);
  }

  let eventPayload = null;

  // Attempt to verify the incoming webhook
  // If successful, the payload will be available from 'evt'
  // If verification fails, error out and return error code
  try {
    eventPayload = wh.verify(JSON.stringify(payload), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    throw new AppError(`Error: Could not verify webhook: ${err.message}`, 400);
  }

  return eventPayload;
};
