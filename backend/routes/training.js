// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\training.js
import express from "express";
import { ObjectId } from "mongodb";
import { trainingScoresCollection } from "../database.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save a new training score for the logged-in user
router.post("/api/training-scores", isAuthenticated, async (req, res) => {
  const { lessonTitle, wpm, accuracy, errors } = req.body;
  const userId = req.session.user.id;

  const newTrainingScore = {
    userId: new ObjectId(userId),
    lessonTitle,
    wpm: Number(wpm),
    accuracy: Number(accuracy),
    errors: Number(errors),
    date: new Date(),
  };

  try {
    await trainingScoresCollection().insertOne(newTrainingScore);
    res.status(201).json({ message: "Training score saved successfully." });
  } catch (error) {
    console.error("Error saving training score:", error);
    res.status(500).json({ message: "Error saving training score." });
  }
});

// Get all training scores for the logged-in user
router.get("/api/training-scores", isAuthenticated, async (req, res) => {
  const trainingScores = await trainingScoresCollection()
    .find({ userId: new ObjectId(req.session.user.id) })
    .sort({ date: -1 })
    .toArray();
  res.json(trainingScores);
});

export default router;
