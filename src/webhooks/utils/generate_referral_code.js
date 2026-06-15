// Helper function to generate a referral code
exports.generateReferralCode = (clerkId) => {
  // Simple implementation - you might want something more sophisticated
  const timestamp = Date.now().toString().slice(-6);
  const idSuffix = clerkId.slice(-4);
  return `REF${timestamp}${idSuffix}`.toUpperCase();
};
