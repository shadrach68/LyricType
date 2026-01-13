// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\songs.js
import express from "express";
import { songDatabase } from "../songData.js";

const router = express.Router();

// API endpoint to get all songs
router.get("/api/songs", (req, res) => {
  res.json(songDatabase);
});

export default router;
