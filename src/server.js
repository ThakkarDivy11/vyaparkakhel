const path = require("path");
const dotenv = require("dotenv");

// Load environment variables first
dotenv.config({
  path: path.resolve(__dirname, "./config/config.env"),
});

const http = require("http");
const config = require("./config/config");
const connectDb = require("./utils/mongodb_connect");
const prettyPrintError = require("./utils/pretty_print_error");

process.on("uncaughtException", (err) => {
  prettyPrintError(err, "uncaughtException", null);
});

// constant and variable declarations here
const env = process.env.NODE_ENV || "development";
const { port } = config[env].connection;
const { app } = require("./app");
const { initSocket } = require("./services/realtime/socketServer");

const startServer = async () => {
  try {
    await connectDb();
    const server = http.createServer(app);
    initSocket(server);
    server.listen(port, () => {
      console.log(`Server listening on port ${port} in ${env} mode`);
    });

    process.on("MongoServerError", (err) => {
      prettyPrintError(err, "MongoServerError", server);
    });

    process.on("unhandledRejection", (err) => {
      prettyPrintError(err, "unhandledRejection", server);
    });
  } catch (err) {
    prettyPrintError(err, "uncaughtException", null);
  }
};

startServer();
