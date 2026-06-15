const mongoose = require("mongoose");
const prettyPrintError = require("./pretty_print_error");
const config = require("../config/config");

// constant and variable declarations here
const env = process.env.NODE_ENV || "development";
const dbUrl = config[env].database.mongodb;

const connectDb = async () => {
  try {
    console.warn("awaiting database connection...");
    await mongoose.connect(dbUrl);
    console.info("Connected to Database!!");
  } catch (err) {
    prettyPrintError(err, "databaseConnectionError", null);
  }
};

module.exports = connectDb;
