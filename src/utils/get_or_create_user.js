const { createClerkClient } = require("@clerk/backend");
const User = require("../models/user.model");
const { commonError } = require("./error");
const config = require("../config/config");

const env = process.env.NODE_ENV || "development";
const clerkSecretKey = config[env]?.clerk?.secretKey || process.env.CLERK_SECRET_KEY || process.env.CLERK_TEST_SECRET_KEY;
const clerk = createClerkClient({ secretKey: clerkSecretKey });

// Build a friendly display name from a Clerk user record.
// Priority: firstName + lastName -> firstName -> username -> primary email local part.
function deriveDisplayName(clerkUser) {
  if (!clerkUser) return null;
  const first = clerkUser.firstName?.trim();
  const last = clerkUser.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (clerkUser.username) return clerkUser.username;
  const primaryEmailId = clerkUser.primaryEmailAddressId;
  const primaryEmail = clerkUser.emailAddresses?.find(
    (e) => e.id === primaryEmailId
  )?.emailAddress;
  if (primaryEmail) return primaryEmail.split("@")[0];
  return null;
}

// Build a unique-friendly username from a Clerk user record.
// Falls back to a providerId-derived value if Clerk gave us nothing usable.
function deriveBaseUsername(clerkUser, providerId) {
  if (clerkUser?.username) {
    return clerkUser.username
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 30);
  }
  const fromName = (clerkUser?.firstName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
  if (fromName) return fromName.slice(0, 24);
  return `u_${providerId.slice(-12).toLowerCase().replace(/[^a-z0-9._-]/g, "")}`;
}

// Core: find-or-create a User by Clerk providerId. On first creation,
// fetches the actual Clerk profile so displayName is the user's real name,
// not a hash. Used by both the REST helper (getOrCreateUser) and the socket
// auth middleware.
async function getOrCreateUserByProviderId(providerId) {
  if (!providerId) return null;

  let user = await User.findOne({ providerId });
  if (user) return user;

  let clerkUser = null;
  try {
    clerkUser = await clerk.users.getUser(providerId);
  } catch (err) {
    console.warn(
      `[getOrCreateUser] Could not fetch Clerk profile for ${providerId}: ${err.message}`
    );
  }

  const displayName =
    deriveDisplayName(clerkUser) ?? `Player ${providerId.slice(-4)}`;
  const baseUsername = deriveBaseUsername(clerkUser, providerId);

  // Username must be 3-30 chars, lowercase alnum/._-, and unique
  let username = baseUsername.length >= 3 ? baseUsername : `u_${baseUsername}`;
  let attempts = 0;
  while (attempts < 5) {
    const conflict = await User.findOne({ username });
    if (!conflict) break;
    username = `${baseUsername}${Math.floor(Math.random() * 10000)}`.slice(0, 30);
    attempts++;
  }

  const primaryEmailId = clerkUser?.primaryEmailAddressId;
  const email = clerkUser?.emailAddresses?.find(
    (e) => e.id === primaryEmailId
  )?.emailAddress;
  const avatarUrl = clerkUser?.imageUrl;

  return User.create({
    providerId,
    username,
    displayName,
    email,
    avatarUrl,
    role: "user",
  });
}

// Express helper: extracts the providerId from req.auth() and delegates.
// Returns the User, or null after calling next(error) for the no-auth case.
async function getOrCreateUser(req, next) {
  const clerkAuth =
    req.auth && typeof req.auth === "function" ? req.auth() : req.auth || {};
  const providerId = clerkAuth?.userId;
  if (!providerId) {
    next(commonError(401, "Unauthenticated", "Missing auth"));
    return null;
  }
  return getOrCreateUserByProviderId(providerId);
}

module.exports = { getOrCreateUser, getOrCreateUserByProviderId };
