const express = require("express");
const bcrypt = require("bcryptjs");
const { db, admin } = require("../lib/firebase");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// GET /api/user/profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).json({ error: "Profile not found" });

    const { passwordHash, ...profile } = doc.data();
    return res.json(profile);
  } catch (err) {
    console.error("get profile error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/user/profile  — used for both initial onboarding and subsequent edits
router.put("/profile", authenticate, async (req, res) => {
  const { name, age, city, monthly_income, risk_level, goals } = req.body;

  if (!name || !age || !city || !monthly_income || !risk_level) {
    return res.status(400).json({ error: "name, age, city, monthly_income and risk_level are required" });
  }

  try {
    const update = {
      name,
      age: Number(age),
      city,
      monthly_income: Number(monthly_income),
      risk_level,
      goals: Array.isArray(goals) ? goals : [],
      onboarded: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(req.user.uid).update(update);
    return res.json(update);
  } catch (err) {
    console.error("update profile error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/user/change-password
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  try {
    const doc = await db.collection("users").doc(req.user.uid).get();
    const { passwordHash } = doc.data();

    if (!passwordHash) {
      return res.status(400).json({ error: "Password change is not available for Google sign-in accounts" });
    }

    const valid = await bcrypt.compare(currentPassword, passwordHash);
    if (!valid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.collection("users").doc(req.user.uid).update({
      passwordHash: newHash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ message: "Password updated" });
  } catch (err) {
    console.error("change password error:", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});

module.exports = router;
