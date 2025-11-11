# 🎵 LyricType - The Ultimate Lyric Typing Game

LyricType is a dynamic, web-based typing game that challenges your speed and accuracy by having you type along to the lyrics of your favorite songs. It features user authentication, persistent score tracking, multiple difficulty levels, and a clean, modern interface.

 ✨ Features

- **Dynamic Typing Interface**: Type lyrics in real-time with immediate visual feedback on your accuracy.
- **User Authentication**: Secure user registration and login system to track personal progress.
- **Personalized Profiles**: View your performance statistics, including average WPM, average accuracy, and a history of all completed songs.
- **Song Library**: Choose from a built-in library of songs across various genres.
- **Difficulty Levels**:
  - **Easy**: Generous time limit for a relaxed experience.
  - **Medium**: A balanced challenge for regular typists.
  - **Hard**: A strict time limit and no backspacing on errors for the ultimate test.
- **Search & Filter**: Easily find songs by title, artist, or lyrics, and filter by difficulty.
- **Custom Songs**: Add your own songs to the library for a personalized typing session.
- **Real-time Stats**: Monitor your Words Per Minute (WPM), accuracy, and progress as you type.
- **Responsive Design**: A seamless experience on both desktop and mobile devices.
- **Light/Dark Mode**: Switch between themes for your viewing comfort.
- **Session Management**: Stay logged in across sessions with secure, cookie-based authentication.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with the native MongoDB driver
- **Authentication**: 
  - `bcrypt` for password hashing.
  - `express-session` & `connect-mongo` for persistent session management.

---

## 📂 Project Structure

```
lyricTypeee/
├── backend/
│   ├── database.js         # MongoDB connection logic
│   └── index.js            # Express server, API routes, and main logic
├── frontend/
│   ├── index.html          # Main application page
│   ├── script.js           # Client-side JavaScript for game logic and UI
│   └── style.css           # All styles for the application
├── .env                    # Environment variables (ignored by Git)
├── .gitignore              # Git ignore configuration
├── package.json            # Project dependencies and scripts
└── README.md               # This file
```

---

🚀 Getting Started

Follow these instructions to get a local copy of the project up and running.

### Prerequisites

- **Node.js**: Make sure you have Node.js installed (v14 or higher).
- **npm**: Node Package Manager (comes with Node.js).
- **MongoDB**: A running instance of MongoDB. You can use a local installation or a cloud service like MongoDB Atlas.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/lyricType.git
    cd lyricType
    ```

2.  **Install backend dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    - Create a `.env` file in the root directory of the project.
    - Copy the contents from `.env.example` into your new `.env` file.
    - **`MONGO_URI`**: Replace the placeholder with your MongoDB connection string.
      - For a local MongoDB instance, this is typically `mongodb://localhost:27017/lyrictype`.
      - For MongoDB Atlas, get the connection string from your cluster's dashboard. Remember to replace `<password>` with your database user's password and whitelist your IP address.
    - **`SECRET`**: Replace the placeholder with a long, random string. This is used to sign the session ID cookie. You can generate one using an online tool or via the command line:
      ```sh
      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
      ```

4.  **Start the server:**
    ```sh
    npm start
    ```

5.  **Open the application:**
    Navigate to `http://localhost:3000` in your web browser.

---

## 🔌 API Endpoints

The backend provides the following RESTful API endpoints:

| Method | Endpoint          | Protection      | Description                               |
| :----- | :---------------- | :-------------- | :---------------------------------------- |
| `POST` | `/api/register`   | Public          | Register a new user.                      |
| `POST` | `/api/login`      | Public          | Log in a user and create a session.       |
| `POST` | `/api/logout`     | Public          | Log out a user and destroy the session.   |
| `GET`  | `/api/session`    | Public          | Check the current user session status.    |
| `GET`  | `/api/songs`      | Public          | Get the list of all available songs.      |
| `POST` | `/api/scores`     | Authenticated   | Save a new score for the logged-in user.  |
| `GET`  | `/api/scores`     | Authenticated   | Get all scores for the logged-in user.    |

---

## 🌟 Future Improvements

- **Global Leaderboard**: A public leaderboard to see how you stack up against other players.
- **More Genres**: Expand the song library with more genres like Rock, R&B, and Classical.
- **Sound Effects**: Add audio feedback for correct keystrokes, errors, and game completion.
- **Achievements**: Implement a system for unlocking badges or achievements based on performance.
- **Admin Panel**: A simple interface for administrators to manage the song database.

---

## 👤 Author

**Chukwunweike Ugwoke**

---

## 📄 License

This project is licensed under the ISC License. See the `package.json` file for details.
