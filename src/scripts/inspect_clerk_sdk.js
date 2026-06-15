const clerk = require('@clerk/backend');
console.log("Keys in @clerk/backend:", Object.keys(clerk));
if (clerk.verifyToken) {
  console.log("verifyToken source:\n", clerk.verifyToken.toString().slice(0, 1000));
} else {
  console.log("verifyToken not found in @clerk/backend");
}
