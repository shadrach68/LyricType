import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb, usersCollection, scoresCollection } from "./database.js";
import bcrypt from "bcrypt";
import session from "express-session";
import MongoStore from "connect-mongo";
import { ObjectId } from "mongodb";
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
  // Pop Classics
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    difficulty: "hard",
    lyrics:
      "She was more like a beauty queen from a movie scene. I said don't mind, but what do you mean, I am the one? She said I am the one who will dance on the floor in the round. She told me her name was Billie Jean, as she caused a scene. Then every head turned with eyes that dreamed of being the one. People always told me be careful of what you do, and don't go around breaking young girls' hearts. And mother always told me be careful of who you love.",
  },

  // Modern Pop
  {
    title: "Sorry",
    artist: "Justin Bieber",
    difficulty: "easy",
    lyrics:
      "You gotta go and get angry at all of my honesty. You know I try but I don't do too well with apologies. I hope I don't run out of time, could someone call a referee? 'Cause I just need one more shot at forgiveness. I know you know that I made those mistakes maybe once or twice. By once or twice I mean maybe a couple a hundred times. So let me, oh, let me redeem, oh, redeem, oh, myself tonight 'cause I just need one more shot at second chances. Yeah, is it too late now to say sorry? 'Cause I'm missing more than just your body. Ooh, is it too late now to say sorry? Yeah, I know that I let you down. Is it too late to say I'm sorry now? I'll take every single piece of the blame if you want me to. But you know that there is no innocent one in this game for two.",
  },
  {
    title: "Shape of You",
    artist: "Ed Sheeran",
    difficulty: "medium",
    lyrics:
      "The club isn't the best place to find a lover so the bar is where I go. Me and my friends at the table doing shots, drinking fast and then we talk slow. You come over and start up a conversation with just me and trust me I'll give it a chance now. Take my hand, stop, put Van the Man on the jukebox and then we start to dance. And now I'm singing like, girl, you know I want your love. Your love was handmade for somebody like me. Come on now, follow my lead. I may be crazy, don't mind me.",
  },
  {
    title: "Perfect",
    artist: "Ed Sheeran",
    difficulty: "easy",
    lyrics:
      "I found a love for me. Oh darling, just dive right in and follow my lead. Well, I found a girl, beautiful and sweet. Oh, I never knew you were the someone waiting for me. 'Cause we were just kids when we fell in love, not knowing what it was. I will not give you up this time. But darling, just kiss me slow, your heart is all I own. And in your eyes, you're holding mine. Baby, I'm dancing in the dark with you between my arms. Barefoot on the grass, listening to our favorite song. When you said you looked a mess, I whispered underneath my breath. But you heard it, darling, you look perfect tonight. Well I found a woman, stronger than anyone I know. She shares my dreams, I hope that someday I'll share her home.",
  },
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    difficulty: "medium",
    lyrics:
      "I've been tryna call. I've been on my own for long enough. Maybe you can show me how to love, maybe. I'm going through withdrawals. You don't even have to do too much. You can turn me on with just a touch, baby. I look around and Sin City's cold and empty. No one's around to judge me. I can't see clearly when you're gone. I said, ooh, I'm blinded by the lights. No, I can't sleep until I feel your touch. I said, ooh, I'm drowning in the night. Oh, when I'm like this, you're the one I trust.",
  },
  {
    title: "Someone Like You",
    artist: "Adele",
    difficulty: "easy",
    lyrics:
      "I heard that you're settled down, that you found a girl and you're married now. I heard that your dreams came true. Guess she gave you things I didn't give to you. Old friend, why are you so shy? Ain't like you to hold back or hide from the light. I hate to turn up out of the blue, uninvited, but I couldn't stay away, I couldn't fight it. I had hoped you'd see my face and that you'd be reminded that for me, it isn't over. Never mind, I'll find someone like you. I wish nothing but the best for you, too. Don't forget me, I beg, I remember you said, sometimes it lasts in love, but sometimes it hurts instead. You know how the time flies. Only yesterday was the time of our lives.",
  },
  {
    title: "Rolling in the Deep",
    artist: "Adele",
    difficulty: "medium",
    lyrics:
      "There's a fire starting in my heart, reaching a fever pitch and it's bringing me out the dark. Finally, I can see you crystal clear. Go ahead and sell me out and I'll lay your ship bare. See how I'll leave with every piece of you. Don't underestimate the things that I will do. The scars of your love remind me of us. They keep me thinking that we almost had it all. The scars of your love, they leave me breathless. I can't help feeling we could have had it all, rolling in the deep.",
  },
  {
    title: "Bad Guy",
    artist: "Billie Eilish",
    difficulty: "medium",
    lyrics:
      "White shirt now red, my bloody nose. Sleepin', you're on your tippy toes. Creepin' around like no one knows. Think you're so criminal. Bruises on both my knees for you. Don't say thank you or please. I do what I want when I'm wantin' to. My soul? So cynical. So you're a tough guy, like it really rough guy, just can't get enough guy, chest always so puffed guy. I'm that bad type, make your mama sad type, make your girlfriend mad tight. I'm the bad guy, duh.",
  },
  {
    title: "All of Me",
    artist: "John Legend",
    difficulty: "easy",
    lyrics:
      "What would I do without your smart mouth? Drawing me in, and you kicking me out. You've got my head spinning, no kidding, I can't pin you down. What's going on in that beautiful mind? I'm on your magical mystery ride. And I'm so dizzy, don't know what hit me, but I'll be alright. My head's under water but I'm breathing fine. You're crazy and I'm out of my mind. 'Cause all of me loves all of you. Love your curves and all your edges, all your perfect imperfections. Give your all to me, I'll give my all to you. You're my end and my beginning. Even when I lose, I'm winning. 'Cause I give you all of me, and you give me all of you.",
  },
  {
    title: "Shake It Off",
    artist: "Taylor Swift",
    difficulty: "medium",
    lyrics:
      "I stay out too late, got nothing in my brain. That's what people say, mmm-mmm. I go on too many dates, but I can't make them stay. At least that's what people say. But I keep cruising, can't stop, won't stop moving. It's like I got this music in my mind saying it's gonna be alright. 'Cause the players gonna play, play, play. And the haters gonna hate, hate, hate. Baby, I'm just gonna shake, shake, shake. I shake it off, I shake it off.",
  },
  {
    title: "Circles",
    artist: "Post Malone",
    difficulty: "easy",
    lyrics:
      "We couldn't turn around 'til we were upside down. I'll be the bad guy now, but know I ain't too proud. I couldn't be there even when I tried. You don't believe it, we do this every time. Seasons change and our love went cold. Feed the flame 'cause we can't let go. Run away, but we're running in circles. Run away, run away. I dare you to do something. I'm waiting on you again, so I don't take the blame. Run away, but we're running in circles. Run away, run away, run away. Let go, I got a feeling that it's time to let go. I say so, I knew that this was doomed from the get-go.",
  },

  // Hip Hop & Rap
  {
    title: "Lollipop",
    artist: "Lil Wayne ft. Static Major",
    difficulty: "hard",
    lyrics:
      "Okay, lil' mama had a swag like mine. She even wear her hair down her back like mine. I make her feel right when it's wrong like lyin'. Man, she ain't never had a love like mine. But man, I ain't never seen a ass like hers, that pussy in my mouth, had me loss for words. I told her to back it up like, 'Err, err!' And make that ass jump like, 'Err, err!' And that's when she said, I want to lick the wrapper.",
  },
  {
    title: "Lose Yourself",
    artist: "Eminem",
    difficulty: "hard",
    lyrics:
      "Look, if you had one shot or one opportunity to seize everything you ever wanted in one moment, would you capture it or just let it slip? Yo, his palms are sweaty, knees weak, arms are heavy. There's vomit on his sweater already, mom's spaghetti. He's nervous, but on the surface he looks calm and ready to drop bombs, but he keeps on forgettin' what he wrote down. The whole crowd goes so loud. He opens his mouth, but the words won't come out. He's chokin', how? Everybody's jokin' now. The clocks run out, times up, over, blaow!",
  },
  {
    title: "Not Afraid",
    artist: "Eminem",
    difficulty: "hard",
    lyrics:
      "I'm not afraid to take a stand. Everybody, come take my hand. We'll walk this road together, through the storm, whatever weather, cold or warm. Just letting you know that you're not alone. Holler if you feel like you've been down the same road. Yeah, it's been a ride. I guess I had to go to that place to get to this one. Now some of you might still be in that place. If you're trying to get out, just follow me. I'll get you there.",
  },
  {
    title: "God's Plan",
    artist: "Drake",
    difficulty: "medium",
    lyrics:
      "Yeah, they wishin' and wishin' and wishin' and wishin', they wishin' on me, yeah. I been movin' calm, don't start no trouble with me. Tryna keep it peaceful is a struggle for me. Don't pull up at 6 AM to cuddle with me. You know how I like it when you lovin' on me. I don't wanna die for them to miss me. Yes, I see the things that they wishin' on me. Hope I got some brothers that outlive me. They gon' tell the story, shit was different with me. God's plan, God's plan.",
  },
  {
    title: "HUMBLE.",
    artist: "Kendrick Lamar",
    difficulty: "hard",
    lyrics:
      "Ayy, I remember syrup sandwiches and crime allowances. Finesse a man with some counterfeits, but now I'm countin' this. Parmesan where my accountant lives, in fact, I'm downin' this. D'USSÉ with my boo bae, tastes like Kool-Aid for the analysts. Girl, I can buy your ass the world with my paystub. Ooh, that's so good, won't you sit it on my taste bloods? I get way too petty once you let me do the extras. Pull up on your block, then break it down, we playin' Tetris. A.M. to the P.M., P.M. to the A.M., funk.",
  },

  // Country
  {
    title: "Old Town Road",
    artist: "Lil Nas X",
    difficulty: "easy",
    lyrics:
      "Yeah, I'm gonna take my horse to the old town road. I'm gonna ride 'til I can't no more. I'm gonna take my horse to the old town road. I'm gonna ride 'til I can't no more. I got the horses in the back, horse tack is attached. Hat is matte black, got the boots that's black to match. Ridin' on a horse, ha, you can whip your Porsche. I been in the valley, you ain't been up off that porch, now. Can't nobody tell me nothin'. You can't tell me nothin'. Ridin' on a tractor, lean all in my bladder. Cheated on my baby, you can go and ask her. My life is a movie.",
  },
  {
    title: "Diamonds",
    artist: "Rihanna",
    difficulty: "easy",
    lyrics:
      "Shine bright like a diamond. Find light in the beautiful sea, I choose to be happy. You and I, you and I, we're like diamonds in the sky. You're a shooting star I see, a vision of ecstasy. When you hold me, I'm alive. We're like diamonds in the sky. I knew that we'd become one right away. Oh, right away. At first sight I felt the energy of sun rays. I saw the life inside your eyes. So shine bright, tonight, you and I. We're beautiful like diamonds in the sky. Eye to eye, so alive. We're beautiful like diamonds in the sky.",
  },

  // Electronic/Dance
  {
    title: "Uptown Funk",
    artist: "Mark Ronson ft. Bruno Mars",
    difficulty: "medium",
    lyrics:
      "This hit, that ice cold, Michelle Pfeiffer, that white gold. This one for them hood girls, them good girls, straight masterpieces. Stylin', wilin', livin' it up in the city. Got Chucks on with Saint Laurent. Got kiss myself, I'm so pretty. I'm too hot, hot damn. Call the police and the fireman. I'm too hot, hot damn. Make a dragon wanna retire, man. I'm too hot, hot damn. Say my name, you know who I am. I'm too hot, hot damn. Am I bad 'bout that money, break it down.",
  },
  {
    title: "Can't Stop the Feeling!",
    artist: "Justin Timberlake",
    difficulty: "medium",
    lyrics:
      "I got this feeling inside my bones. It goes electric, wavy when I turn it on. All through my city, all through my home. We're flying up, no ceiling, when we in our zone. I got that sunshine in my pocket, got that good soul in my feet. I feel that hot blood in my body when it drops. I can't take my eyes up off it, moving so phenomenally. Room on lock, the way we rock it, so don't stop. Under the lights when everything goes, nowhere to hide when I'm getting you close. When we move, well, you already know.",
  },
];

async function startServer() {
  await setupSession();
  const db = await connectDb();

  // --- API ROUTES ---

  // Register a new user
  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    try {
      const existingUser = await usersCollection().findOne({ username });
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await usersCollection().insertOne({ username, password: hashedPassword });

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
    req.session.user = { id: user._id, username: user.username };
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
    const { wpm, accuracy, songTitle, artist, difficulty } = req.body;
    const userId = req.session.user.id;

    const newScore = {
      userId: new ObjectId(userId),
      wpm,
      accuracy,
      songTitle,
      artist,
      difficulty,
      date: new Date(),
    };

    try {
      await scoresCollection().insertOne(newScore);
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

  // Serve static files from the 'frontend' directory.
  app.use(express.static(path.join(__dirname, "../frontend")));

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
