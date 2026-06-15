// src/config/config.js
//
// Per-environment config for the Vyaparkhel multiplayer game.
// MongoDB database name is derived from the project + env, NOT hard-coded
// to "development" / "staging" / "production" so multiple projects sharing
// the same Atlas cluster don't collide.

const APP_DB_NAME = "vyaparkhel"; // change here only if you want to rename the DB

function buildMongoUri(envSuffix) {
  const raw = process.env.DATABASE_CONNECTION_STRING;
  if (!raw) return undefined;
  // Allow either pre-substituted URI or one with <db_username>/<db_password>
  const withCreds = raw
    .replace("<db_username>", process.env.DATABASE_USERNAME ?? "")
    .replace("<db_password>", process.env.DATABASE_PASSWORD ?? "");
  // Strip a trailing slash so we can cleanly append the db name
  const base = withCreds.replace(/\/+$/, "");
  return `${base}/${APP_DB_NAME}${envSuffix ? `-${envSuffix}` : ""}`;
}

module.exports = {
  common: {
    appName: "Vyaparkhel",
    defaultProfileImage: process.env.DEFAULT_PROFILE_IMAGE_URL,
  },
  development: {
    connection: {
      port: process.env.PORT || process.env.DEV_PORT || 3000,
    },
    database: {
      mongodb: buildMongoUri("dev"),
    },
    clerk: {
      publishableKey: process.env.CLERK_TEST_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_TEST_SECRET_KEY,
      signingSecret: process.env.CLERK_TEST_SINGING_SECRET,
    },
    redis: {
      url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    },
  },
  staging: {
    connection: {
      port: process.env.PORT || process.env.STAGING_PORT || 5002,
    },
    database: {
      mongodb: buildMongoUri("staging"),
    },
    clerk: {
      publishableKey: process.env.CLERK_STAGING_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_STAGING_SECRET_KEY,
      signingSecret: process.env.CLERK_STAGING_SINGING_SECRET,
    },
    redis: {
      url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    },
  },
  production: {
    connection: {
      port: process.env.PORT || process.env.PRODUCTION_PORT || 5003,
    },
    database: {
      mongodb: buildMongoUri(""), // production -> "vyaparkhel" (no suffix)
    },
    clerk: {
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
      signingSecret: process.env.CLERK_SIGNING_SECRET,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
  },
};
