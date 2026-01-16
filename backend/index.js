import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb } from "./database.js";
import session from "express-session";
import MongoStore from "connect-mongo";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import songRoutes from "./routes/songs.js";
import scoreRoutes from "./routes/scores.js";
import trainingRoutes from "./routes/training.js";
import userRoutes from "./routes/user.js";
import feedbackRoutes from "./routes/feedback.js";

// Since we are using ES modules, __dirname is not available. This is the workaround.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

async function setupSession() {
  await connectDb(); // Ensure DB is connected before setting up session store
  app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl:
          process.env.MONGO_URI ||
          "mongodb://localhost:27017/lyrictype-sessions",
      }),
      cookie: { maxAge: null },
    })
  );
}

async function startServer() {
  await setupSession();
  const db = await connectDb();

  // --- API ROUTES ---
  app.use(authRoutes);
  app.use(songRoutes);
  app.use(scoreRoutes);
  app.use(trainingRoutes);
  app.use(userRoutes);
  app.use(feedbackRoutes);

  // Serve static files from the 'frontend' directory.
  app.use(express.static(path.join(__dirname, "../frontend")));

  // Start the server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
