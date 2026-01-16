// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\scores.js
import express from "express";
import { ObjectId } from "mongodb";
import { scoresCollection, usersCollection } from "../database.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Save a new score for the logged-in user
router.post("/api/scores", isAuthenticated, async (req, res) => {
  const {
    wpm,
    accuracy,
    errors,
    songTitle,
    artist,
    difficulty,
    timeTaken,
    date,
  } = req.body;
  const userId = req.session.user.id;

  const newScore = {
    userId: new ObjectId(userId),
    wpm: Number(wpm),
    accuracy: Number(accuracy),
    errors: Number(errors),
    songTitle,
    artist,
    difficulty,
    timeTaken,
    date: date ? new Date(date) : new Date(),
  };

  try {
    await scoresCollection().insertOne(newScore);

    // If the song was fully completed, increment the user's progress
    if (req.body.completed) {
      const updateField = `completedSongs.${difficulty}`;
      const updateResult = await usersCollection().updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { [updateField]: 1 } }
      );

      if (updateResult.modifiedCount > 0) {
        // Update the session to reflect the new count
        req.session.user.completedSongs[difficulty]++;
      }

      // Add the song title to the list of completed songs, avoiding duplicates
      const titleUpdateResult = await usersCollection().updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { completedSongTitles: songTitle } }
      );

      if (titleUpdateResult.modifiedCount > 0) {
        req.session.user.completedSongTitles.push(songTitle);
      }
    }

    res.status(201).json({ message: "Score saved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error saving score." });
  }
});

// Get all scores for the logged-in user
router.get("/api/scores", isAuthenticated, async (req, res) => {
  const scores = await scoresCollection()
    .find({ userId: new ObjectId(req.session.user.id) })
    .sort({ date: -1 })
    .toArray();
  res.json(scores);
});

// Get leaderboard (best player per song)
router.get("/api/leaderboard", async (req, res) => {
  try {
    const { difficulty } = req.query;
    const pipeline = [];

    if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) {
      pipeline.push({ $match: { difficulty } });
    }

    pipeline.push(
      { $sort: { wpm: -1, accuracy: -1 } },
      {
          $group: {
            _id: { songTitle: "$songTitle", artist: "$artist" },
            bestScore: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$bestScore" } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $project: {
            username: { $arrayElemAt: ["$userInfo.username", 0] },
            songTitle: 1,
            artist: 1,
            wpm: 1,
            accuracy: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            difficulty: 1,
          },
        },
        { $sort: { wpm: -1 } },
        { $limit: 10 },
    );

    const leaderboard = await scoresCollection().aggregate(pipeline).toArray();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard." });
  }
});

// Get recent global activity (public)
router.get("/api/recent-activity", async (req, res) => {
  try {
    const recentScores = await scoresCollection()
      .aggregate([
        { $sort: { date: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $project: {
            username: { $arrayElemAt: ["$userInfo.username", 0] },
            songTitle: 1,
            wpm: 1,
            accuracy: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          },
        },
      ])
      .toArray();
    res.json(recentScores);
  } catch (error) {
    res.status(500).json({ message: "Error fetching activity." });
  }
});

export default router;
