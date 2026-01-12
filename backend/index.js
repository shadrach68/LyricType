import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  connectDb,
  usersCollection,
  scoresCollection,
  trainingScoresCollection,
  feedbackCollection,
} from "./database.js";
import bcrypt from "bcrypt";
import session from "express-session";
import MongoStore from "connect-mongo";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import crypto from "crypto";
import "dotenv/config";

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
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
    })
  );
}

// This is the song data, moved from your frontend script.js
const songDatabase = [
  // Michael Jackson
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    difficulty: "hard",
    minWpm: 32,
    lyrics:
      "She was more like a beauty queen from a movie scene. I said don't mind, but what do you mean, I am the one? She said I am the one who will dance on the floor in the round. She told me her name was Billie Jean, as she caused a scene. Then every head turned with eyes that dreamed of being the one. People always told me be careful of what you do, and don't go around breaking young girls' hearts. And mother always told me be careful of who you love.",
  },
  {
    title: "Thriller",
    artist: "Michael Jackson",
    difficulty: "hard",
    minWpm: 35,
    minAccuracy: 95,
    lyrics:
      "It's close to midnight, something evil's lurking in the dark. Under the moonlight, you see a sight that almost stops your heart. You try to scream, but terror takes the sound before you make it. You start to freeze as horror looks you right between the eyes, you're paralyzed. 'Cause this is thriller, thriller night. And no one's gonna save you from the beast about to strike. You know it's thriller, thriller night. You're fighting for your life inside a killer, thriller tonight.",
  },
  {
    title: "Beat It",
    artist: "Michael Jackson",
    difficulty: "medium",
    minWpm: 28,
    lyrics:
      "They told him, 'Don't you ever come around here. Don't wanna see your face, you better disappear.' The fire's in their eyes and their words are really clear. So beat it, just beat it. You better run, you better do what you can. Don't wanna see no blood, don't be a macho man. You wanna be tough, better do what you can. So beat it, but you wanna be bad. Just beat it, beat it, beat it, beat it. No one wants to be defeated.",
  },
  {
    title: "Man in the Mirror",
    artist: "Michael Jackson",
    difficulty: "easy",
    minAccuracy: 93,
    lyrics:
      "I'm starting with the man in the mirror. I'm asking him to change his ways. And no message could have been any clearer. If you wanna make the world a better place, take a look at yourself and then make a change. I've been a victim of a selfish kind of love. It's time that I realize that there are some with no home, not a nickel to loan. Could it be really me, pretending that they're not alone? A willow deeply scarred, somebody's broken heart, and a washed-out dream.",
  },
  // Justin Bieber
  {
    title: "Sorry",
    artist: "Justin Bieber",
    difficulty: "easy",
    minWpm: 20,
    lyrics:
      "You gotta go and get angry at all of my honesty. You know I try but I don't do too well with apologies. I hope I don't run out of time, could someone call a referee? 'Cause I just need one more shot at forgiveness. I know you know that I made those mistakes maybe once or twice. By once or twice I mean maybe a couple a hundred times. So let me, oh, let me redeem, oh, redeem, oh, myself tonight 'cause I just need one more shot at second chances. Yeah, is it too late now to say sorry? 'Cause I'm missing more than just your body. Ooh, is it too late now to say sorry? Yeah, I know that I let you down. Is it too late to say I'm sorry now? I'll take every single piece of the blame if you want me to. But you know that there is no innocent one in this game for two.",
  },
  {
    title: "Baby",
    artist: "Justin Bieber",
    difficulty: "medium",
    minAccuracy: 94,
    lyrics:
      "You know you love me, I know you care. Just shout whenever, and I'll be there. You want my love, you want my heart. And we will never, ever, ever be apart. Are we an item? Girl, quit playin'. We're just friends, what are you sayin'? Said there's another and looked right in my eyes. My first love broke my heart for the first time. And I was like, baby, baby, baby, oh. Like baby, baby, baby, no. Like baby, baby, baby, oh. I thought you'd always be mine.",
  },
  // Ed Sheeran
  {
    title: "Shape of You",
    artist: "Ed Sheeran",
    difficulty: "medium",
    minWpm: 30,
    minAccuracy: 94,
    lyrics:
      "The club isn't the best place to find a lover so the bar is where I go. Me and my friends at the table doing shots, drinking fast and then we talk slow. You come over and start up a conversation with just me and trust me I'll give it a chance now. Take my hand, stop, put Van the Man on the jukebox and then we start to dance. And now I'm singing like, girl, you know I want your love. Your love was handmade for somebody like me. Come on now, follow my lead. I may be crazy, don't mind me.",
  },
  {
    title: "Perfect",
    artist: "Ed Sheeran",
    difficulty: "easy",
    minAccuracy: 95,
    lyrics:
      "I found a love for me. Oh darling, just dive right in and follow my lead. Well, I found a girl, beautiful and sweet. Oh, I never knew you were the someone waiting for me. 'Cause we were just kids when we fell in love, not knowing what it was. I will not give you up this time. But darling, just kiss me slow, your heart is all I own. And in your eyes, you're holding mine. Baby, I'm dancing in the dark with you between my arms. Barefoot on the grass, listening to our favorite song. When you said you looked a mess, I whispered underneath my breath. But you heard it, darling, you look perfect tonight. Well I found a woman, stronger than anyone I know. She shares my dreams, I hope that someday I'll share her home.",
  },
  {
    title: "Bad Habits",
    artist: "Ed Sheeran",
    difficulty: "medium",
    minWpm: 30,
    minAccuracy: 95,
    lyrics:
      "Every time you come around, you know I can't say no. Every time the sun goes down, I let you take control. I can feel the paradise before my world implodes. And tonight had something wonderful. My bad habits lead to late nights ending alone. Conversations with a stranger I barely know. Swearing this will be the last, but it probably won't. I got nothing left to lose, or use, or do. My bad habits lead to wide eyes stare into space. And I know I'll lose control of the things that I say.",
  },
  {
    title: "Thinking Out Loud",
    artist: "Ed Sheeran",
    difficulty: "easy",
    minAccuracy: 94,
    lyrics:
      "When your legs don't work like they used to before, and I can't sweep you off of your feet. Will your mouth still remember the taste of my love? Will your eyes still smile from your cheeks? And darling, I will be loving you 'til we're seventy. And baby, my heart could still fall as hard at twenty-three. And I'm thinking 'bout how people fall in love in mysterious ways. Maybe just the touch of a hand. Oh me, I fall in love with you every single day. And I just wanna tell you I am.",
  },
  // Eminem
  {
    title: "Lose Yourself",
    artist: "Eminem",
    difficulty: "hard",
    minWpm: 35,
    lyrics:
      "Look, if you had one shot or one opportunity to seize everything you ever wanted in one moment, would you capture it or just let it slip? Yo, his palms are sweaty, knees weak, arms are heavy. There's vomit on his sweater already, mom's spaghetti. He's nervous, but on the surface he looks calm and ready to drop bombs, but he keeps on forgettin' what he wrote down. The whole crowd goes so loud. He opens his mouth, but the words won't come out. He's chokin', how? Everybody's jokin' now. The clocks run out, times up, over, blaow!",
  },
  {
    title: "Not Afraid",
    artist: "Eminem",
    difficulty: "hard",
    minAccuracy: 97,
    lyrics:
      "I'm not afraid to take a stand. Everybody, come take my hand. We'll walk this road together, through the storm, whatever weather, cold or warm. Just letting you know that you're not alone. Holler if you feel like you've been down the same road. Yeah, it's been a ride. I guess I had to go to that place to get to this one. Now some of you might still be in that place. If you're trying to get out, just follow me. I'll get you there.",
  },
  // Drake
  {
    title: "God's Plan",
    artist: "Drake",
    difficulty: "medium",
    minAccuracy: 96,
    lyrics:
      "Yeah, they wishin' and wishin' and wishin' and wishin', they wishin' on me, yeah. I been movin' calm, don't start no trouble with me. Tryna keep it peaceful is a struggle for me. Don't pull up at 6 AM to cuddle with me. You know how I like it when you lovin' on me. I don't wanna die for them to miss me. Yes, I see the things that they wishin' on me. Hope I got some brothers that outlive me. They gon' tell the story, shit was different with me. God's plan, God's plan.",
  },
  // Celine Dion
  {
    title: "My Heart Will Go On",
    artist: "Celine Dion",
    difficulty: "easy",
    minAccuracy: 94,
    lyrics:
      "Every night in my dreams I see you, I feel you. That is how I know you go on. Far across the distance and spaces between us, you have come to show you go on. Near, far, wherever you are, I believe that the heart does go on. Once more you open the door and you're here in my heart and my heart will go on and on. Love can touch us one time and last for a lifetime. And never let go 'til we're gone. Love was when I loved you, one true time I hold to. In my life we'll always go on.",
  },
  // Westlife
  {
    title: "My Love",
    artist: "Westlife",
    difficulty: "easy",
    minAccuracy: 93,
    lyrics:
      "An empty street, an empty house, a hole inside my heart. I'm all alone, the rooms are getting smaller. I wonder how, I wonder why, I wonder where they are. The days we had, the songs we sang together. And oh, my love, I'm holding on forever. Reaching for a love that seems so far. So I say a little prayer and hope my dreams will take me there. Where the skies are blue to see you once again, my love. Over seas from coast to coast, to find a place I love the most. Where the fields are green to see you once again, my love.",
  },
  {
    title: "Seasons in the Sun",
    artist: "Westlife",
    difficulty: "easy",
    minWpm: 22,
    lyrics:
      "Goodbye to you, my trusted friend. We've known each other since we were nine or ten. Together we've climbed hills and trees. Learned of love and ABCs, skinned our hearts and skinned our knees. Goodbye my friend, it's hard to die. When all the birds are singing in the sky. Now that the spring is in the air. Pretty girls are everywhere. Think of me and I'll be there.",
  },
  {
    title: "Flying Without Wings",
    artist: "Westlife",
    difficulty: "easy",
    minAccuracy: 95,
    lyrics:
      "Everybody's looking for that something. One thing that makes it all complete. You'll find it in the strangest places. Places you never knew it could be. Some find it in the face of their children. Some find it in their lover's eyes. Who can deny the joy it brings when you've found that special thing? You're flying without wings. So impossible as they may seem, you've got to fight for every dream. 'Cause who's to know which one you let go would have made you complete.",
  },
  {
    title: "Uptown Girl",
    artist: "Westlife",
    difficulty: "medium",
    minWpm: 26,
    minAccuracy: 95,
    lyrics:
      "Uptown girl, she's been living in her uptown world. I bet she's never had a backstreet guy. I bet her mama never told her why. I'm gonna try for an uptown girl. She's been living in her white bread world. As long as anyone with hot blood can. And now she's looking for a downtown man. That's what I am. And when she knows what she wants from her time. And when she wakes up and makes up her mind. She'll see I'm not so tough. Just because I'm in love with an uptown girl.",
  },
  {
    title: "Swear It Again",
    artist: "Westlife",
    difficulty: "medium",
    minAccuracy: 96,
    lyrics:
      "I wanna know who ever told you I was letting go of the only joy that I have ever known. Girl, they were lying. Just look at me crying. I'm not going anywhere, I'm not going anywhere. I swear it again, I'm not gonna leave you. I swear it again, I'm not gonna deceive you. And I swear it again, I'm not gonna hurt you. I swear it again, I'm not gonna desert you. I'm not going anywhere, I'm not going anywhere.",
  },
  {
    title: "World of Our Own",
    artist: "Westlife",
    difficulty: "hard",
    minAccuracy: 98,
    lyrics:
      "You make me feel funny when you come around. Yeah, that's the sound that I'm hearing. You make me feel dizzy, my feet off the ground. And I don't know what I'm thinking. I'm trying to be cool, but you're making it hard. I'm trying to be me, but you're changing my heart. You're making me weak, you're making me fall. I'm telling you now, I'm giving my all. We've got a little world of our own. I'll tell you things that no one else knows. I'll let you in if you'll let me be your one and only.",
  },
  // John Legend
  {
    title: "All of Me",
    artist: "John Legend",
    difficulty: "medium",
    minAccuracy: 96,
    lyrics:
      "What would I do without your smart mouth? Drawing me in, and you kicking me out. You've got my head spinning, no kidding, I can't pin you down. What's going on in that beautiful mind? I'm on your magical mystery ride. And I'm so dizzy, don't know what hit me, but I'll be alright. My head's under water but I'm breathing fine. You're crazy and I'm out of my mind. 'Cause all of me loves all of you. Love your curves and all your edges, all your perfect imperfections. Give your all to me, I'll give my all to you.",
  },
];

async function startServer() {
  await setupSession();
  const db = await connectDb();

  // Setup nodemailer transporter before it's used in the routes
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // --- API ROUTES ---

  // Register a new user
  app.post("/api/register", async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required." });
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    try {
      const existingUser = await usersCollection().findOne({ username });
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists." });
      }

      const existingEmail = await usersCollection().findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ message: "Email is already in use." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await usersCollection().insertOne({
        username,
        password: hashedPassword,
        email,
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
  app.post("/api/login", async (req, res) => {
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
      trainingProgress: user.trainingProgress || 0,
      themePreference: user.themePreference || "dark",
      completedSongs: user.completedSongs || { easy: 0, medium: 0, hard: 0 },
      completedSongTitles: user.completedSongTitles || [],
    };
    res.json({ message: "Logged in successfully.", user: req.session.user });
  });

  // Logout a user
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out." });
      }
      res.clearCookie("connect.sid"); // The default session cookie name
      res.json({ message: "Logged out successfully." });
    });
  });

  // Add a new route to check session status
  app.get("/api/session", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(200).json({ user: null }); // Use 200 to indicate a successful check, just no user
    }
  });

  // API endpoint to get all songs
  app.get("/api/songs", (req, res) => {
    res.json(songDatabase);
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized: You must be logged in." });
    }
  };

  // Save a new score for the logged-in user
  app.post("/api/scores", isAuthenticated, async (req, res) => {
    const { wpm, accuracy, errors, songTitle, artist, difficulty } = req.body;
    const userId = req.session.user.id;

    const newScore = {
      userId: new ObjectId(userId),
      wpm,
      accuracy,
      errors,
      songTitle,
      artist,
      difficulty,
      date: new Date(),
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
  app.get("/api/scores", isAuthenticated, async (req, res) => {
    const scores = await scoresCollection()
      .find({ userId: new ObjectId(req.session.user.id) })
      .sort({ date: -1 })
      .toArray();
    res.json(scores);
  });

  // --- Mobile / Social Routes ---

  // Get leaderboard (best player per song)
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await scoresCollection()
        .aggregate([
          { $sort: { wpm: -1, accuracy: -1 } },
          {
            $group: {
              _id: "$songTitle",
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
              date: 1,
              difficulty: 1
            },
          },
          { $sort: { wpm: -1 } }
        ])
        .toArray();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Error fetching leaderboard." });
    }
  });

  // Get recent global activity (public)
  app.get("/api/recent-activity", async (req, res) => {
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
              date: 1,
            },
          },
        ])
        .toArray();
      res.json(recentScores);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activity." });
    }
  });

  // Get all feedback (Protected: requires login)
  app.get("/api/feedback", isAuthenticated, async (req, res) => {
    const feedback = await feedbackCollection()
      .find({})
      .sort({ date: -1 })
      .toArray();
    res.json(feedback);
  });

  // Post feedback (Protected: requires login)
  app.post("/api/feedback", isAuthenticated, async (req, res) => {
    const { message, rating } = req.body;
    if (!message || !rating) return res.status(400).json({ message: "Message and rating are required" });

    const newFeedback = {
      userId: new ObjectId(req.session.user.id),
      username: req.session.user.username,
      message,
      rating: parseInt(rating),
      date: new Date(),
    };

    await feedbackCollection().insertOne(newFeedback);
    res.status(201).json({ message: "Feedback posted successfully" });
  });

  // Save a new training score for the logged-in user
  app.post("/api/training-scores", isAuthenticated, async (req, res) => {
    const { lessonTitle, wpm, accuracy, errors } = req.body;
    const userId = req.session.user.id;

    const newTrainingScore = {
      userId: new ObjectId(userId),
      lessonTitle,
      wpm,
      accuracy,
      errors,
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
  app.get("/api/training-scores", isAuthenticated, async (req, res) => {
    const trainingScores = await trainingScoresCollection()
      .find({ userId: new ObjectId(req.session.user.id) })
      .sort({ date: -1 })
      .toArray();
    res.json(trainingScores);
  });

  // Request a password reset
  app.post("/api/forgot-password", async (req, res) => {
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
  app.post("/api/reset-password", async (req, res) => {
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

  // Save the user's training lesson progress
  app.post("/api/user/training-progress", isAuthenticated, async (req, res) => {
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
  app.post("/api/user/password", isAuthenticated, async (req, res) => {
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
  app.delete("/api/user", isAuthenticated, async (req, res) => {
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
  app.post("/api/user/theme", isAuthenticated, async (req, res) => {
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

  // Serve static files from the 'frontend' directory.
  app.use(express.static(path.join(__dirname, "../frontend")));

  // Start the server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
