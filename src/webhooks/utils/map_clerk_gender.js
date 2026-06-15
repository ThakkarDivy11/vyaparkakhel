// Helper function to map Clerk gender to your model's gender enum
exports.mapClerkGender = (clerkGender) => {
  if (!clerkGender) return undefined;

  // Normalize to lowercase for comparison
  const gender = clerkGender.toLowerCase();

  if (gender === "") return "unspecified";
  if (gender === "male" || gender === "m") return "male";
  if (gender === "female" || gender === "f") return "female";
  return "other";
};
