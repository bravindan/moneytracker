const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const PHONE_EMAIL_SUFFIX = "@auth.moneytracker";

/**
 * Cloud Function: Directly reset a user's password by phone number.
 * POST { phone: "0712345678", newPassword: "newpass123" }
 */
exports.resetPassword = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, newPassword } = req.body || {};

  if (!phone || !newPassword) {
    return res.status(400).json({ error: "Phone and newPassword are required" });
  }

  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const email = `${cleanPhone}${PHONE_EMAIL_SUFFIX}`;

  try {
    // Look up user by email
    const userRecord = await getAuth().getUserByEmail(email);

    // Update password directly using Admin SDK
    await getAuth().updateUser(userRecord.uid, { password: newPassword });

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "No account found for this phone number" });
    }
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});
