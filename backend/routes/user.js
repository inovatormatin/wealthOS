const express = require("express");
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

module.exports = router;
