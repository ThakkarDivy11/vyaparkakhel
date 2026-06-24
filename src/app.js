const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");

// internal imports here
const globalErrorHandler = require("./utils/error_hanlder");
const AppError = require("./utils/app_error");
const requestTimeMiddleware = require("./middlewares/request_time.middleware");
const config = require("./config/config");

// router imports here
const userRouter = require("./routers/user/user.routes");
const webhookRouter = require("./routers/webhook.routes");
const gameRouter = require("./routers/user/game.routes");
const expressGameRouter = require("./routers/user/expressGame.routes");
const propertyRouter = require("./routers/user/property.routes");
const paymentRouter = require("./routers/user/payment.routes");

// constants and variables definitions here
const app = express();
const env = process.env.NODE_ENV || "development";
const clerk = config[env]?.clerk || {};
const publishableKey = clerk.publishableKey || process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_TEST_PUBLISHABLE_KEY;
const secretKey = clerk.secretKey || process.env.CLERK_SECRET_KEY || process.env.CLERK_TEST_SECRET_KEY;

// middlewares
app.use(cors());
app.use(express.json());

if (env === "development") {
  app.use(morgan("dev"));
}

app.use(
  clerkMiddleware({
    publishableKey,
    secretKey,
  })
);
// adds the request time to the request object
app.use(requestTimeMiddleware);

// Mount user routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/games", gameRouter);
app.use("/api/v1/payments", paymentRouter);

// Mount AI/Express REST routes
app.use("/api/game", expressGameRouter);
app.use("/api/property", propertyRouter);

// common routes
app.use("/api/v1/webhooks", webhookRouter);

app.use("/", (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Server is active!!",
    auth: req.auth || "No auth object found",
  });
});

app.all("*", (req, res, next) => {
  next(new AppError(`Unable to find ${req.originalUrl} on this server!!`, 404));
});

app.use(globalErrorHandler);

module.exports = { app };
