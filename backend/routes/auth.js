// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\auth.js
import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { usersCollection } from "../database.js";
import "dotenv/config";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Register a new user
router.post("/api/register", async (req, res) => {
  const { username, password, email, gender } = req.body;
  if (!username || !password || !email || !gender) {
    return res
      .status(400)
      .json({ message: "Username, email, password, and gender are required." });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  try {
    if (
      process.env.ADMIN_USERNAME &&
      username.toLowerCase() === process.env.ADMIN_USERNAME.toLowerCase()
    ) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const existingUser = await usersCollection().findOne({
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const existingEmail = await usersCollection().findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
    });
    if (existingEmail) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await usersCollection().insertOne({
      username,
      password: hashedPassword,
      email,
      gender,
      trainingProgress: 0,
      themePreference: "dark", // Default theme for new users
      completedSongs: {
        easy: 0,
        medium: 0,
        hard: 0,
      },
      completedSongTitles: [],
    });

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

// Login a user
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  const user = await usersCollection().findOne({ username });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  // Save user in session (without password)
  req.session.user = {
    id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: user.username === process.env.ADMIN_USERNAME,
    trainingProgress: user.trainingProgress || 0,
    themePreference: user.themePreference || "dark",
    completedSongs: user.completedSongs || { easy: 0, medium: 0, hard: 0 },
    completedSongTitles: user.completedSongTitles || [],
  };
  res.json({ message: "Logged in successfully.", user: req.session.user });
});

// Logout a user
router.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out." });
    }
    res.clearCookie("connect.sid"); // The default session cookie name
    res.json({ message: "Logged out successfully." });
  });
});

// Add a new route to check session status
router.get("/api/session", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(200).json({ user: null }); // Use 200 to indicate a successful check, just no user
  }
});

// Request a password reset
router.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await usersCollection().findOne({ email });
    if (!user) {
      // To prevent email enumeration, we send a generic success message even if the email doesn't exist.
      return res.json({
        message:
          "If your email is in our system, a password reset link has been sent.",
      });
    }

    const token = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit code
    const expires = Date.now() + 3600000; // 1 hour from now

    await usersCollection().updateOne(
      { _id: user._id, email: user.email },
      { $set: { resetPasswordToken: token, resetPasswordExpires: expires } }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset for LyricType",
      html: `
          <p>You requested a password reset for your LyricType account.</p>
          <p>Your password reset code is: <strong>${token}</strong></p>
          <p>This code is valid for one hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message:
        "If your email is in our system, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Error processing password reset." });
  }
});

// Reset password using a token
router.post("/api/reset-password", async (req, res) => {
  const { token, email, password } = req.body;

  try {
    const user = await usersCollection().findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await usersCollection().updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
        },
      }
    );

    // Also destroy any active session for this user
    // This part is tricky without storing session IDs against users.
    // Forcing re-login after reset is a good practice.
    res.json({
      message: "Password has been reset successfully. Please log in.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password." });
  }
});

export default router;
