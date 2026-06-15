const path = require('path');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config({
  path: path.resolve(__dirname, "../config/config.env"),
});

const { verifyToken } = require('@clerk/backend');
const config = require('../config/config');

const env = process.env.NODE_ENV || 'development';
const clerkSecretKey = config[env]?.clerk?.secretKey || process.env.CLERK_SECRET_KEY || process.env.CLERK_TEST_SECRET_KEY;

console.log("NODE_ENV:", env);
console.log("Secret key prefix:", clerkSecretKey ? clerkSecretKey.substring(0, 7) : 'none');
console.log("Secret key length:", clerkSecretKey ? clerkSecretKey.length : 0);

verifyToken("dummy_token", { secretKey: clerkSecretKey })
  .then(res => console.log("Success:", res))
  .catch(err => console.log("Caught Error:", err.message, "\nStack:", err.stack));
