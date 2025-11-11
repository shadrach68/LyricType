let currentSong = null;
let currentWordIndex = 0;
let startTime = null;
let totalWords = 0;
let correctWords = 0;
let isPaused = false;
let timer = null;
let allSongs = [];
let filteredSongs = [];
let currentDifficultyFilter = null;
let timeLimit = 0;
let timeRemaining = 0;
let inactivityTimer = null;
let lastActivity = null;
let isTutorialRunning = false;
let currentUser = null;

// Time limits in seconds for each difficulty
const timeLimits = {
  easy: 300, // 5 minutes
  medium: 180, // 3 minutes
  hard: 120, // 2 minutes
};

const INACTIVITY_TIMEOUT = 10000; // 10 seconds in milliseconds

async function checkSession() {
  try {
    const response = await fetch("/api/session");
    const data = await response.json();
    if (data.user) {
      currentUser = data.user;
      updateUserUI();
    }
  } catch (error) {
    console.error("Could not check session:", error);
    // App can still run without a logged-in user
  }
}

async function fetchSongs() {
  try {
    const response = await fetch("/api/songs");
    const songs = await response.json();
    allSongs = songs;
    renderSongs();
  } catch (error) {
    console.error("Failed to fetch songs:", error);
    const songGrid = document.getElementById("songGrid");
    songGrid.innerHTML =
      '<div class="empty-message">Could not load songs. Please try refreshing the page.</div>';
  }
}

function initializeApp() {
  // Check session first to see if user is already logged in
  checkSession().then(() => {
    fetchSongs(); // Then fetch songs
  });
  setupEventListeners();
  setupScrollAnimations();
}

function setupScrollAnimations() {
  // Create intersection observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      } else {
        // Remove visible class when element goes out of view
        entry.target.classList.remove("visible");
      }
    });
  }, observerOptions);

  // Observe all animated elements
  observeElements(observer);
}

function observeElements(observer = null) {
  const animatedElements = document.querySelectorAll(
    ".fade-in, .slide-in-left, .slide-in-right, .scale-in"
  );

  if (!observer) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        } else {
          // Remove visible class when element goes out of view
          entry.target.classList.remove("visible");
        }
      });
    }, observerOptions);
  }

  animatedElements.forEach((element) => {
    observer.observe(element);
  });
}

function renderSongs() {
  const songGrid = document.getElementById("songGrid");
  songGrid.innerHTML = "";

  if (currentDifficultyFilter === null) {
    songGrid.innerHTML =
      '<div class="empty-message">🎯 Please select a difficulty level above to see available songs!</div>';
    return;
  }

  if (filteredSongs.length === 0) {
    songGrid.innerHTML =
      '<div class="no-songs-message">No songs found. Try a different search or add a custom song!</div>';
    return;
  }

  filteredSongs.forEach((song, index) => {
    const songCard = document.createElement("div");
    songCard.className = "song-card fade-in";
    songCard.innerHTML = `
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">by ${song.artist}</div>
                    <div class="song-difficulty ${
                      song.difficulty
                    }">${song.difficulty.toUpperCase()} - ${
      song.difficulty === "easy"
        ? "5 MIN"
        : song.difficulty === "medium"
        ? "3 MIN"
        : "2 MIN"
    }</div>
                    ${
                      song.isCustom
                        ? '<div class="song-custom">📝 Custom</div>'
                        : ""
                    }
                `;
    songCard.addEventListener("click", () => selectSong(song));
    songGrid.appendChild(songCard);
  });

  // Trigger animations after a short delay
  setTimeout(() => {
    observeElements();
  }, 100);
}

function selectSong(song) {
  // Check if a user is logged in before starting the game
  if (!currentUser) {
    showNotification("Please log in to play a song.", "info");
    showModal("loginModal");
    return; // Stop execution here
  }

  // Remove previous selection
  document.querySelectorAll(".song-card").forEach((card) => {
    card.classList.remove("selected");
  });

  // Find the clicked card and add the 'selected' class
  event.currentTarget.classList.add("selected");

  setTimeout(() => {
    startTyping(song);
  }, 500);
}

function startTyping(song) {
  currentSong = song;
  currentWordIndex = 0;
  correctWords = 0;
  startTime = null;
  isPaused = false;

  // Set time limit based on difficulty
  timeLimit = timeLimits[song.difficulty];
  timeRemaining = timeLimit;

  // Hide sidebar when typing starts
  document.body.classList.add("sidebar-collapsed");

  document.getElementById("songSelector").style.display = "none";
  document.getElementById("typingArea").classList.add("active");

  renderLyrics();
  resetStats();

  // Trigger animations for typing area elements
  setTimeout(() => {
    observeElements();
    document.getElementById("typingInput").focus();
  }, 100);
}

function renderLyrics() {
  const lyricsDisplay = document.getElementById("lyricsDisplay");
  const words = currentSong.lyrics.split(" ");
  totalWords = words.length;

  lyricsDisplay.innerHTML = words
    .map((word, index) => {
      const letters = word
        .split("")
        .map((char) => `<span class="char">${char}</span>`)
        .join("");
      return `<span class="word" data-index="${index}">${letters}</span>`;
    })
    .join(" ");

  // Search functionality
  document
    .getElementById("searchInput")
    .addEventListener("input", handleSearch);
  document.getElementById("searchBtn").addEventListener("click", handleSearch);
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });
  updateWordClasses();
}

function updateWordClasses() {
  const wordElements = document.querySelectorAll(".word");
  wordElements.forEach((wordEl, index) => {
    wordEl.classList.remove("current", "correct", "incorrect");
    if (index === currentWordIndex) {
      wordEl.classList.add("current");
    } else if (index < currentWordIndex) {
      // This part is handled by handleWordComplete, but we can keep it for robustness
    }
  });
}

function setupEventListeners() {
  const typingInput = document.getElementById("typingInput");

  typingInput.addEventListener("input", handleTyping);
  typingInput.addEventListener("keydown", (e) => {
    recordActivity();

    // Hard mode rule: Cannot backspace on an error
    if (
      e.key === "Backspace" &&
      currentSong &&
      currentSong.difficulty === "hard"
    ) {
      const currentWordEl = document.querySelector(".word.current");
      if (currentWordEl && currentWordEl.querySelector(".char.incorrect")) {
        e.preventDefault(); // Prevent backspace
        // Add a visual shake to indicate the error is permanent
        document.getElementById("typingArea").classList.add("shake");
        setTimeout(() => document.getElementById("typingArea").classList.remove("shake"), 300);
      }
    }

    if (e.key === " ") {
      e.preventDefault();
      handleWordComplete();
    }
  });

  // Search functionality
  document
    .getElementById("searchInput")
    .addEventListener("input", handleSearch);
  document.getElementById("searchBtn").addEventListener("click", handleSearch);
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });

  // Difficulty filter functionality
  document.querySelectorAll(".difficulty-filter").forEach((button) => {
    button.addEventListener("click", handleDifficultyFilter);
  });

  // Custom song functionality
  document
    .getElementById("addCustomBtn")
    .addEventListener("click", showCustomSongModal);
  document
    .getElementById("saveSongBtn")
    .addEventListener("click", saveCustomSong);
  document
    .getElementById("cancelSongBtn")
    .addEventListener("click", hideCustomSongModal);

  document.getElementById("restartBtn").addEventListener("click", restartSong);
  document.getElementById("pauseBtn").addEventListener("click", togglePause);
  document.getElementById("backBtn").addEventListener("click", backToSongs);
  document.getElementById("tryAgainBtn").addEventListener("click", restartSong);
  document.getElementById("newSongBtn").addEventListener("click", backToSongs);

  // Sidebar and Tutorial functionality
  document.getElementById("sidebarToggle").addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
  document
    .getElementById("tutorialBtn")
    .addEventListener("click", showTutorialModal);
  document
    .getElementById("profileBtn")
    .addEventListener("click", showProfileModal);
  document
    .getElementById("closeProfileBtn")
    .addEventListener("click", () => hideModal("profileModal"));
  document
    .getElementById("closeTutorialBtn")
    .addEventListener("click", hideTutorialModal);

  // Account Modals
  document
    .getElementById("accountBtn")
    .addEventListener("click", handleAccountClick);
  document
    .getElementById("loginSubmitBtn")
    .addEventListener("click", handleLogin);
  document
    .getElementById("registerSubmitBtn")
    .addEventListener("click", handleRegister);

  // Logout confirmation
  document
    .getElementById("confirmLogoutBtn")
    .addEventListener("click", handleLogout);
  document
    .getElementById("cancelLogoutBtn")
    .addEventListener("click", () => hideModal("logoutConfirmModal"));

  document.getElementById("showRegisterBtn").addEventListener("click", () => {
    hideModal("loginModal");
    showModal("registerModal");
  });
  document.getElementById("showLoginBtn").addEventListener("click", () => {
    hideModal("registerModal");
    showModal("loginModal");
  });

  // Add listeners to close modals when clicking outside
  document.getElementById("loginModal").addEventListener("click", (e) => {
    if (e.target.id === "loginModal") hideModal("loginModal");
  });
  document.getElementById("registerModal").addEventListener("click", (e) => {
    if (e.target.id === "registerModal") hideModal("registerModal");
  });
  document
    .getElementById("logoutConfirmModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "logoutConfirmModal") hideModal("logoutConfirmModal");
    });
  document.getElementById("profileModal").addEventListener("click", (e) => {
    if (e.target.id === "profileModal") hideModal("profileModal");
  });

  // Add listeners for all modal close buttons
  document.querySelectorAll(".modal-close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.currentTarget.dataset.modalId;
      hideModal(modalId);
    });
  });

  // Add listeners for password visibility toggles
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const passwordInput = e.currentTarget.previousElementSibling;
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        e.currentTarget.textContent = "🙈";
      } else {
        passwordInput.type = "password";
        e.currentTarget.textContent = "👁️";
      }
      // Keep focus on the input
      passwordInput.focus();
    });
  });
}
// Theme toggle functionality
document
  .getElementById("themeToggleBtn")
  .addEventListener("click", toggleTheme);

function showTutorialModal() {
  showModal("tutorialModal");
}

function hideTutorialModal() {
  hideModal("tutorialModal");
}

function showModal(modalId) {
  document.getElementById(modalId).classList.add("show");
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
  // Clear inputs in login/register modals when hiding
  const inputs = document.getElementById(modalId).querySelectorAll("input");
  inputs.forEach((input) => (input.value = ""));
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");

  const isLightMode = document.body.classList.contains("light-mode");
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");

  if (isLightMode) {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light Mode";
  } else {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark Mode";
  }
}

function handleTyping(e) {
  recordActivity();

  if (!startTime && !isPaused) {
    startTime = Date.now();
    startTimer();
    startInactivityTimer();
  }

  const currentWordEl = document.querySelector(
    `[data-index="${currentWordIndex}"]`
  );
  if (!currentWordEl) return;

  const characters = currentWordEl.querySelectorAll(".char");
  const typedValue = e.target.value;

  // Loop through each character span in the current word
  characters.forEach((charSpan, index) => {
    const typedChar = typedValue[index];

    // Reset classes
    charSpan.classList.remove("correct", "incorrect");

    if (typedChar == null) {
      // Not typed yet
    } else if (typedChar === charSpan.innerText) {
      // Correct character
      charSpan.classList.add("correct");
    } else {
      // Incorrect character
      charSpan.classList.add("incorrect");
    }
  });
}

function handleWordComplete() {
  if (isTutorialRunning) return; // Prevent user from advancing tutorial

  recordActivity();

  const input = document.getElementById("typingInput");
  const typedWord = input.value.trim();
  const words = currentSong.lyrics.split(" ");
  const originalWord = words[currentWordIndex];

  const currentWordEl = document.querySelector(
    `[data-index="${currentWordIndex}"]`
  );
  currentWordEl.classList.remove("current");

  if (typedWord === originalWord) {
    currentWordEl.classList.add("correct");
    correctWords++;
  } else {
    currentWordEl.classList.add("incorrect");
  }

  currentWordIndex++;
  input.value = "";

  if (currentWordIndex < words.length) {
    const nextWordEl = document.querySelector(
      `[data-index="${currentWordIndex}"]`
    );
    if (nextWordEl) nextWordEl.classList.add("current");
    updateStats();
  } else {
    completeSong();
  }
}

function updateStats() {
  const accuracy = Math.round(
    (correctWords / Math.max(currentWordIndex, 1)) * 100
  );
  const progress = Math.round((currentWordIndex / totalWords) * 100);

  document.getElementById("accuracyStat").textContent = accuracy + "%";
  document.getElementById("progressStat").textContent = progress + "%";
  document.getElementById("progressFill").style.width = progress + "%";

  if (startTime) {
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const wpm = Math.round(correctWords / Math.max(timeElapsed, 0.1));
    document.getElementById("wpmStat").textContent = wpm;
  }
}

function startTimer() {
  timer = setInterval(() => {
    if (!isPaused && startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timeRemaining = Math.max(0, timeLimit - elapsed);

      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;

      const timeDisplay = document.getElementById("timeStat");
      timeDisplay.textContent = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

      // Change color when time is running low (use classes)
      timeDisplay.classList.remove("time-default", "time-warning", "time-low");
      if (timeRemaining <= 30) {
        timeDisplay.classList.add("time-low");
      } else if (timeRemaining <= 60) {
        timeDisplay.classList.add("time-warning");
      } else {
        timeDisplay.classList.add("time-default");
      }

      // Time's up!
      if (timeRemaining <= 0) {
        timeUp();
      }
    }
  }, 1000);
}

function recordActivity() {
  lastActivity = Date.now();
  resetInactivityTimer();
}

function startInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  inactivityTimer = setTimeout(() => {
    if (!isPaused && startTime) {
      autoPause();
    }
  }, INACTIVITY_TIMEOUT);
}

function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  if (!isPaused && startTime) {
    startInactivityTimer();
  }
}

function autoPause() {
  if (!isPaused) {
    togglePause();
    showNotification(
      "Game paused after 10 seconds of inactivity. Press Resume to continue!",
      "info"
    );
  }
}

function togglePause() {
  isPaused = !isPaused;
  const pauseBtn = document.getElementById("pauseBtn");
  const typingInput = document.getElementById("typingInput");

  if (isPaused) {
    pauseBtn.textContent = "▶️ Resume";
    typingInput.disabled = true;
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  } else {
    pauseBtn.textContent = "⏸️ Pause";
    typingInput.disabled = false;
    typingInput.focus();
    recordActivity();
    startInactivityTimer();
  }
}

function restartSong() {
  isTutorialRunning = false; // Stop tutorial if running
  document.getElementById("completionModal").classList.remove("show");
  if (currentSong) {
    startTyping(currentSong);
  }
}

function backToSongs() {
  isTutorialRunning = false; // Stop tutorial if running
  document.getElementById("completionModal").classList.remove("show");
  document.getElementById("typingArea").classList.remove("active");
  document.getElementById("songSelector").style.display = ""; // Use CSS to control display

  // Show sidebar when returning to song list
  document.body.classList.remove("sidebar-collapsed");

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  resetStats();
}

function resetStats() {
  document.getElementById("wpmStat").textContent = "0";
  document.getElementById("accuracyStat").textContent = "100%";
  document.getElementById("progressStat").textContent = "0%";

  // Show time limit for current song
  if (currentSong) {
    const minutes = Math.floor(timeLimit / 60);
    const seconds = timeLimit % 60;
    document.getElementById("timeStat").textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    document.getElementById("timeStat").textContent = "0:00";
  }

  // Reset timer color and animation
  const timeDisplay = document.getElementById("timeStat");
  // Reset time display classes
  timeDisplay.classList.remove("time-low", "time-warning");
  timeDisplay.classList.add("time-default");

  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("typingInput").value = "";
  document.getElementById("typingInput").disabled = false;
}

function timeUp() {
  isTutorialRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  // Disable typing input
  document.getElementById("typingInput").disabled = true;

  const accuracy = Math.round(
    (correctWords / Math.max(currentWordIndex, 1)) * 100
  );
  const timeElapsed = (Date.now() - startTime) / 1000 / 60;
  const wpm = Math.round(correctWords / timeElapsed);
  const progress = Math.round((currentWordIndex / totalWords) * 100);

  document.getElementById("finalStats").innerHTML = `
        <div class="final-block">
          <div class="final-title final-title--danger">⏰ Time's Up!</div>
          <div class="final-subtitle">"${currentSong.title}" by ${
    currentSong.artist
  }</div>
          <div class="final-grid">
            <div><strong>Speed:</strong> ${wpm} WPM</div>
            <div><strong>Accuracy:</strong> ${accuracy}%</div>
            <div><strong>Progress:</strong> ${progress}%</div>
            <div><strong>Words:</strong> ${correctWords}/${totalWords}</div>
          </div>
          <div class="final-challenge final-challenge--danger">
            <strong>Challenge:</strong> ${currentSong.difficulty.toUpperCase()} - ${Math.floor(
    timeLimit / 60
  )} minute${timeLimit >= 120 ? "s" : ""} limit
          </div>
        </div>
      `;

  document.getElementById("completionModal").classList.add("show");
}

function completeSong() {
  isTutorialRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  const accuracy = Math.round((correctWords / totalWords) * 100);
  const timeElapsed = (Date.now() - startTime) / 1000 / 60;
  const wpm = Math.round(correctWords / timeElapsed);
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  const timeBonus = timeRemaining > 0 ? Math.round(timeRemaining / 10) : 0;
  const score = {
    wpm,
    accuracy,
    songTitle: currentSong.title,
    artist: currentSong.artist,
    difficulty: currentSong.difficulty,
  };

  document.getElementById("finalStats").innerHTML = `
        <div class="final-block">
          <div class="final-title final-title--success">🎉 Song Complete!</div>
          <div class="final-subtitle">"${currentSong.title}" by ${
    currentSong.artist
  }</div>
          <div class="final-grid">
            <div><strong>Speed:</strong> ${wpm} WPM</div>
            <div><strong>Accuracy:</strong> ${accuracy}%</div>
            <div><strong>Time:</strong> ${minutes}:${seconds
    .toString()
    .padStart(2, "0")}</div>
            <div><strong>Words:</strong> ${correctWords}/${totalWords}</div>
          </div>
          <div class="final-challenge final-challenge--success">
            <strong>Challenge:</strong> ${currentSong.difficulty.toUpperCase()} completed with ${Math.floor(
    timeRemaining / 60
  )}:${(timeRemaining % 60).toString().padStart(2, "0")} remaining!
            ${
              timeBonus > 0
                ? `<br><strong>Time Bonus:</strong> +${timeBonus} points!`
                : ""
            }
          </div>
        </div>
      `;

  document.getElementById("completionModal").classList.add("show");

  // If user is logged in, save the score
  if (currentUser) {
    saveScore(score);
  }
}

function handleSearch() {
  applyFilters();
}

function handleDifficultyFilter(e) {
  // Use class toggles for active state so styles live in CSS
  document
    .querySelectorAll(".difficulty-filter")
    .forEach((btn) => btn.classList.remove("active"));
  const btn = e.currentTarget || e.target;
  btn.classList.add("active");

  // Update current filter and apply
  currentDifficultyFilter = btn.dataset.difficulty;
  applyFilters();
}

function applyFilters() {
  if (currentDifficultyFilter === null) {
    filteredSongs = [];
    renderSongs();
    return;
  }

  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  // Start with songs of selected difficulty
  let filtered = allSongs.filter(
    (song) => song.difficulty === currentDifficultyFilter
  );

  // Apply search filter
  if (searchTerm !== "") {
    filtered = filtered.filter(
      (song) =>
        song.title.toLowerCase().includes(searchTerm) ||
        song.artist.toLowerCase().includes(searchTerm) ||
        song.lyrics.toLowerCase().includes(searchTerm)
    );
  }

  filteredSongs = filtered;
  renderSongs();
}

function showCustomSongModal() {
  showModal("customSongModal");
  document.getElementById("customTitle").focus();
}

function hideCustomSongModal() {
  document.getElementById("customSongModal").classList.remove("show");
  // Clear form
  document.getElementById("customTitle").value = "";
  document.getElementById("customArtist").value = "";
  document.getElementById("customLyrics").value = "";
  document.getElementById("customDifficulty").value = "easy";
}

function saveCustomSong() {
  const title = document.getElementById("customTitle").value.trim();
  const artist = document.getElementById("customArtist").value.trim();
  const lyrics = document.getElementById("customLyrics").value.trim();
  const difficulty = document.getElementById("customDifficulty").value;

  if (!title || !artist || !lyrics) {
    showNotification("Please fill in all fields!", "error");
    return;
  }

  if (lyrics.split(" ").length < 10) {
    showNotification(
      "Lyrics should have at least 10 words for a good typing practice!",
      "error"
    );
    return;
  }

  const newSong = {
    title,
    artist,
    lyrics,
    difficulty,
    isCustom: true,
  };

  allSongs.push(newSong);

  hideCustomSongModal();
  applyFilters(); // Re-apply current filters to include new song if it matches
  showNotification(
    `"${title}" has been added to your song library!`,
    "success"
  );
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification--${
    type === "error" ? "error" : type === "success" ? "success" : "info"
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Hide then remove after a short timeout using CSS class
  setTimeout(() => {
    notification.classList.add("notification--hide");
    setTimeout(() => {
      if (notification.parentNode)
        notification.parentNode.removeChild(notification);
    }, 300);
  }, 3000);
}

async function saveScore(score) {
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(score),
    });
    if (response.ok) {
      console.log("Score saved successfully.");
    } else {
      console.error("Failed to save score.");
    }
  } catch (error) {
    console.error("Error saving score:", error);
  }
}

async function showProfileModal() {
  showModal("profileModal");
  const profileBody = document.getElementById("profileBody");
  profileBody.innerHTML =
    '<div class="profile-loading">Loading profile data...</div>';

  try {
    const response = await fetch("/api/scores");
    if (!response.ok) {
      profileBody.innerHTML =
        '<div class="empty-message">Could not load profile. Please try again.</div>';
      return;
    }
    const scores = await response.json();
    renderProfile(scores);
  } catch (error) {
    profileBody.innerHTML =
      '<div class="empty-message">Error loading profile.</div>';
  }
}

function renderProfile(scores) {
  const profileBody = document.getElementById("profileBody");
  if (scores.length === 0) {
    profileBody.innerHTML =
      '<div class="empty-message">You haven\'t completed any songs yet. Go type!</div>';
    return;
  }

  const avgWpm = Math.round(
    scores.reduce((sum, s) => sum + s.wpm, 0) / scores.length
  );
  const avgAccuracy = Math.round(
    scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length
  );

  const scoresHtml = scores
    .map(
      (score) => `
    <tr>
      <td>
        <span class="song-title-small">${score.songTitle}</span>
        <span class="artist-small">by ${score.artist}</span>
      </td>
      <td>${score.wpm}</td>
      <td>${score.accuracy}%</td>
      <td>${new Date(score.date).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join("");

  profileBody.innerHTML = `
    <div class="profile-stats-grid">
      <div class="profile-stat-card"><div class="profile-stat-value">${avgWpm}</div><div class="profile-stat-label">Avg. WPM</div></div>
      <div class="profile-stat-card"><div class="profile-stat-value">${avgAccuracy}%</div><div class="profile-stat-label">Avg. Accuracy</div></div>
      <div class="profile-stat-card"><div class="profile-stat-value">${scores.length}</div><div class="profile-stat-label">Songs Typed</div></div>
    </div>
    <div class="profile-history">
      <h3>Recent Activity</h3>
      <table class="profile-scores-table">
        <thead><tr><th>Song</th><th>WPM</th><th>Accuracy</th><th>Date</th></tr></thead>
        <tbody>
          ${scoresHtml}
        </tbody>
      </table>
    </div>
  `;
}

function handleAccountClick() {
  if (currentUser) {
    // If user is logged in, log them out
    showModal("logoutConfirmModal");
  } else {
    // If user is not logged in, show login modal
    showModal("loginModal");
  }
}

async function handleLogin() {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      updateUserUI();
      hideModal("loginModal");
      showNotification(`Welcome back, ${currentUser.username}!`, "success");
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Login failed. Please try again.", "error");
  }
}

async function handleRegister() {
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      hideModal("registerModal");
      showModal("loginModal");
      showNotification("Registration successful! Please log in.", "success");
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Registration failed. Please try again.", "error");
  }
}

async function handleLogout() {
  try {
    hideModal("logoutConfirmModal");
    await fetch("/api/logout", { method: "POST" });
    showNotification("You have been logged out.", "info");
    currentUser = null;
    updateUserUI();
  } catch (error) {
    showNotification("Logout failed.", "error");
  }
}

function updateUserUI() {
  const accountBtn = document.getElementById("accountBtn");
  const icon = accountBtn.querySelector(".sidebar-icon");
  const text = accountBtn.querySelector(".sidebar-text");

  const profileBtnContainer = document.getElementById("profileBtnContainer");

  if (currentUser) {
    icon.textContent = "👋";
    text.textContent = `Logout (${currentUser.username})`;
    profileBtnContainer.style.display = "block";
  } else {
    icon.textContent = "👤";
    text.textContent = "Login";
    profileBtnContainer.style.display = "none";
  }
}

// Initialize the app
initializeApp();
