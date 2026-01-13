// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\user.js
import express from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import { usersCollection, scoresCollection, trainingScoresCollection } from "../database.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save the user's training lesson progress
router.post("/api/user/training-progress", isAuthenticated, async (req, res) => {
  const { progress } = req.body;
  const userId = req.session.user.id;

  if (typeof progress !== "number" || progress < 0) {
    return res.status(400).json({ message: "Invalid progress value." });
  }

  try {
    await usersCollection().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { trainingProgress: progress } }
    );
    // Also update the progress in the current session
    req.session.user.trainingProgress = progress;
    res.json({ message: "Training progress saved." });
  } catch (error) {
    console.error("Error saving training progress:", error);
    res.status(500).json({ message: "Error saving training progress." });
  }
});

// Reset user password
router.post("/api/user/password", isAuthenticated, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.session.user.id;

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Old and new passwords are required." });
  }

  try {
    const user = await usersCollection().findOne({
      _id: new ObjectId(userId),
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid old password." });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await usersCollection().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedNewPassword } }
    );

    // Destroy the session to force re-login
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Password updated, but could not log out." });
      }
      res.clearCookie("connect.sid").json({
        message: "Password updated successfully. Please log in again.",
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating password." });
  }
});

// Delete user account
router.delete("/api/user", isAuthenticated, async (req, res) => {
  const { password } = req.body;
  const userId = req.session.user.id;

  if (!password) {
    return res
      .status(400)
      .json({ message: "Password is required for deletion." });
  }

  try {
    const user = await usersCollection().findOne({
      _id: new ObjectId(userId),
    });
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Delete user and all their associated scores
    await usersCollection().deleteOne({ _id: new ObjectId(userId) });
    await scoresCollection().deleteMany({ userId: new ObjectId(userId) });
    await trainingScoresCollection().deleteMany({
      userId: new ObjectId(userId),
    });

    req.session.destroy(() =>
      res.json({ message: "Account deleted successfully." })
    );
  } catch (error) {
    res.status(500).json({ message: "Error deleting account." });
  }
});

// Save the user's theme preference
router.post("/api/user/theme", isAuthenticated, async (req, res) => {
  const { theme } = req.body;
  const userId = req.session.user.id;

  if (!theme || (theme !== "light" && theme !== "dark")) {
    return res.status(400).json({ message: "Invalid theme value." });
  }

  try {
    await usersCollection().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { themePreference: theme } }
    );
    req.session.user.themePreference = theme; // Update session
    res.json({ message: "Theme preference saved." });
  } catch (error) {
    res.status(500).json({ message: "Error saving theme preference." });
  }
});

export default router;
