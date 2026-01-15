// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\songs.js
import express from "express";
import { ObjectId } from "mongodb";
import { songDatabase } from "../songData.js";
import { customSongsCollection } from "../database.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// API endpoint to get all songs
router.get("/api/songs", async (req, res) => {
  let songs = [...songDatabase];

  if (req.session.user) {
    try {
      const customSongs = await customSongsCollection()
        .find({ userId: new ObjectId(req.session.user.id) })
        .toArray();
      songs = [...songs, ...customSongs];
    } catch (error) {
      console.error("Error fetching custom songs:", error);
    }
  }

  res.json(songs);
});

// Save a custom song (Private to user)
router.post("/api/songs/custom", isAuthenticated, async (req, res) => {
  const { title, artist, lyrics, difficulty, genre } = req.body;

  const newSong = {
    userId: new ObjectId(req.session.user.id),
    title,
    artist,
    lyrics,
    difficulty,
    genre,
    isCustom: true,
    createdAt: new Date(),
  };

  try {
    await customSongsCollection().insertOne(newSong);
    res.status(201).json({ message: "Custom song saved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to save custom song." });
  }
});

// Delete a custom song
router.delete("/api/songs/custom/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  try {
    const result = await customSongsCollection().deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Song not found or unauthorized." });
    }

    res.json({ message: "Song deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete song." });
  }
});

// Update a custom song
router.put("/api/songs/custom/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { title, artist, lyrics, difficulty, genre } = req.body;
  const userId = req.session.user.id;

  try {
    const result = await customSongsCollection().updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: { title, artist, lyrics, difficulty, genre } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Song not found or unauthorized." });
    }

    res.json({ message: "Song updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update song." });
  }
});

export default router;
