// utils/map_clerk_data_to_user_model.js
const { generateReferralCode } = require("./generate_referral_code");
const { mapClerkGender } = require("./map_clerk_gender");

exports.mapClerkDataToUserModel = (clerkData) => {
  if (!clerkData || !clerkData.id) {
    throw new Error("Invalid Clerk data: missing id");
  }

  // Extract primary email address safely
  const primaryEmail =
    clerkData.email_addresses?.find(
      (email) => email.id === clerkData.primary_email_address_id
    )?.email_address ||
    clerkData.email_addresses?.[0]?.email_address ||
    "";

  // Extract primary phone number safely
  const primaryPhone =
    clerkData.phone_numbers?.find(
      (phone) => phone.id === clerkData.primary_phone_number_id
    )?.phone_number ||
    clerkData.phone_numbers?.[0]?.phone_number ||
    "";

  return {
    clerkId: clerkData.id,
    userFullName: {
      firstName: clerkData.first_name || "",
      middleName: "", // Clerk doesn't provide middle name by default
      lastName: clerkData.last_name || "",
    },
    referralCode: generateReferralCode(clerkData.id),
    email: primaryEmail,
    phoneNumber: primaryPhone,
    userType: "user", // Default to regular user
    isLoggedIn: true,
    isBanned: clerkData.banned || false,
    hasActiveSubscription: false,
    isYearlyUser: false,
    isPremiumUser: false,
    subscription: {
      website_count: 0,
      logo_generated: 0,
      images_generated: 0,
      blog_generated: 0,
      allowed_website_count: 1,
      allowed_logo_count: 4,
      allowed_images_count: 4,
      allowed_blog_count: 4,
    },
    profileImage:
      clerkData.image_url || process.env.DEFAULT_PROFILE_IMAGE_URL || "",
    gender: mapClerkGender(clerkData.gender),
    birthday: clerkData.birthday || "",
    metadata: {
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      signUpMethod: "clerk_webhook",
    },
  };
};
