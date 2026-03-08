const express = require("express");
const bcrypt = require("bcryptjs");
const { db, admin } = require("../lib/firebase");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require("../lib/jwt");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const existingSnap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userRef = db.collection("users").doc();
    const userId = userRef.id;

    const userDoc = {
      userId,
      name,
      email,
      passwordHash,
      provider: "email",
      onboarded: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userRef.set(userDoc);

    const tokenPayload = { uid: userId, email, name };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      accessToken,
      user: { uid: userId, name, email },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const snap = await db
      .collection("users")
      .where("email", "==", email)
      .where("provider", "==", "email")
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userDoc = snap.docs[0].data();
    const valid = await bcrypt.compare(password, userDoc.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tokenPayload = { uid: userDoc.userId, email: userDoc.email, name: userDoc.name };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    setRefreshCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: { uid: userDoc.userId, name: userDoc.name, email: userDoc.email },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/google  — frontend sends Firebase idToken
router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "idToken is required" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid: firebaseUid, email, name, picture } = decoded;

    const usersRef = db.collection("users");
    let userId;
    let userName;

    const existingSnap = await usersRef
      .where("email", "==", email)
      .where("provider", "==", "google")
      .limit(1)
      .get();

    if (existingSnap.empty) {
      // First time Google sign-in — create user doc
      const userRef = usersRef.doc();
      userId = userRef.id;
      userName = name || email.split("@")[0];

      await userRef.set({
        userId,
        name: userName,
        email,
        provider: "google",
        firebaseUid,
        photoURL: picture || null,
        onboarded: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      const userDoc = existingSnap.docs[0].data();
      userId = userDoc.userId;
      userName = userDoc.name;
    }

    const tokenPayload = { uid: userId, email, name: userName };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    setRefreshCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: { uid: userId, name: userName, email },
    });
  } catch (err) {
    console.error("google auth error:", err);
    return res.status(401).json({ error: "Google authentication failed" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "No refresh token" });
  }

  try {
    const payload = verifyRefreshToken(token);
    const { uid, email, name } = payload;

    const accessToken = signAccessToken({ uid, email, name });

    return res.json({ accessToken, user: { uid, name, email } });
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  clearRefreshCookie(res);
  return res.json({ message: "Logged out" });
});

module.exports = router;
