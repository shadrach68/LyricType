let currentSong = null;
let currentWordIndex = 0;
let startTime = null;
let totalWords = 0;
let correctWords = 0;
let totalCharsTyped = 0;
let correctChars = 0;
let pauseStartTime = null;
let errorCount = 0;
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
let completedSongTitles = [];
let userCompletionProgress = {
  easy: 0,
  medium: 0,
  hard: 0,
};

// --- Audio ---
const errorSound = new Audio("sounds/error.mp3");

// Training state
let isTrainingActive = false;
const trainingLessons = [
  {
    title: "1. Home Row Basics",
    timeLimit: 300,
    drills: [
      {
        text: "asdf jkl; asdf jkl; ff jj dd kk ss ll aa ;;",
        instruction: "Let's start with the home row. Keep it steady.",
      },
      {
        text: "ask a lad; a sad lad; all fall; ask a lass;",
        instruction: "Now let's type some words on the home row.",
      },
      {
        text: "Jaffa; Kassala; Dallas; Alf; Ada; Alfalfa;",
        instruction: "Time for uppercase. Use the Shift key!",
      },
      {
        text: "A sad lad asks a lass; A fall; A flask;",
        instruction: "Practice sentences with capital letters.",
      },
    ],
  },
  {
    title: "2. Home Row Extension",
    timeLimit: 240,
    drills: [
      {
        text: "fgf jhj fgf jhj gh hg fg jg hf fj hj gf;",
        instruction: "Reach for G and H with your index fingers.",
      },
      {
        text: "glad; half; jag; had; gas; dash; flash; flag;",
        instruction: "Let's form some words with G and H.",
      },
      {
        text: "He had a flag; She has a gas flask; He fell;",
        instruction: "Now for some sentences with mixed case.",
      },
    ],
  },
  {
    title: "3. Top Row",
    timeLimit: 180,
    drills: [
      {
        text: "qwer tyuiop qwer tyuiop ee ii rr uu tt yy",
        instruction: "Reach up to the top row.",
      },
      {
        text: "quote; poetry; write; their; error; quiet; trip;",
        instruction: "Practice some top row words.",
      },
      {
        text: "The quiet writer quit; Where is the poetry?",
        instruction: "Combine rows and add punctuation.",
      },
      {
        text: "Quote: 'The error is quiet.' He replied.",
        instruction: "Let's try quotes and more complex sentences.",
      },
    ],
  },
  {
    title: "4. Bottom Row",
    timeLimit: 120,
    drills: [
      {
        text: "zxcv bnm,./ zxcv bnm,./",
        instruction:
          "Reach down to the bottom row. Notice the comma and period.",
      },
      {
        text: "vex; maze; can, move; buzz; maximum; minimum;",
        instruction: "Practice words with the bottom row.",
      },
      {
        text: "My name is Shaddy. My Dog is very lazy, a bit.",
        instruction: "Combine all three rows with punctuation.",
      },
      {
        text: "The quick brown fox jumps over the lazy dog.",
        instruction: "The classic pangram to test all your skills!",
      },
    ],
  },
  {
    title: "5. Numbers Row",
    timeLimit: 150,
    drills: [
      {
        text: "12345 67890 12345 67890",
        instruction: "Let's practice the number row.",
      },
      {
        text: "1a 2s 3d 4f 5g 6h 7j 8k 9l 0;",
        instruction: "Alternate between numbers and the home row.",
      },
      {
        text: "The year is 2024. The price is 199. The code is 7890.",
        instruction: "Practice typing numbers in sentences.",
      },
    ],
  },
  {
    title: "6. Symbols & Punctuation",
    timeLimit: 180,
    drills: [
      {
        text: "!@#$%^&*()_+",
        instruction: "Time for symbols! Use the Shift key with the number row.",
      },
      {
        text: "My email is Shaddy@gmail.com. Is that right?",
        instruction: "Practice common symbols like '@' and '?'",
      },
      {
        text: "The cost is $50.00! That's a 50% discount. (Wow!)",
        instruction: "Combine numbers, symbols, and sentences.",
      },
    ],
  },
  {
    title: "7. Common English Words",
    timeLimit: 120,
    drills: [
      {
        text: "the be to of and a in that have I it for not on with he as",
        instruction: "Let's master some of the most common words.",
      },
      {
        text: "you do at this but his by from they we say her she or an will",
        instruction: "Continue with more frequent words.",
      },
      {
        text: "my one all would there their what so up out if about who get",
        instruction: "The faster you type these, the better you'll be!",
      },
    ],
  },
  {
    title: "8. Advanced Sentences",
    timeLimit: 240,
    drills: [
      {
        text: "Programming is the art of telling a computer what to do.",
        instruction: "Let's type some longer sentences.",
      },
      {
        text: "The journey of a thousand miles begins with a single step.",
        instruction: "Focus on maintaining a steady rhythm.",
      },
      {
        text: "Never underestimate the power of a good book; it can change your life.",
        instruction: "Pay attention to the semicolon and comma.",
      },
      {
        text: "What we think, we become. - Buddha",
        instruction: "A final challenge with quotes and punctuation.",
      },
    ],
  },
];
let trainingProgress = 0; // Index of the highest unlocked lesson
let currentLessonIndex = 0;
let currentDrillIndex = 0;
let currentTrainingCharIndex = 0;
let trainingTimer = null;
let isTrainingPaused = false;
let trainingTimeRemaining = 0;
let trainingStartTime = null;
let trainingInactivityTimer = null;
let trainingPauseStartTime = null;
let trainingCorrectChars = 0;
let trainingTotalChars = 0;

// Time limits in seconds for each difficulty
const timeLimits = {
  easy: 300, // 5 minutes
  medium: 180, // 3 minutes
  hard: 120, // 2 minutes
};

const INACTIVITY_TIMEOUT = 10000; // 10 seconds in milliseconds
const TRAINING_INACTIVITY_TIMEOUT = 5000; // 5 seconds for training

async function checkSession() {
  try {
    const response = await fetch("/api/session");
    const data = await response.json();
    if (data.user) {
      currentUser = data.user;
      trainingProgress = currentUser.trainingProgress || 0;
      applyTheme(currentUser.themePreference); // Apply user's saved theme
      userCompletionProgress = currentUser.completedSongs || {
        easy: 0,
        medium: 0,
        hard: 0,
      };
      completedSongTitles = currentUser.completedSongTitles || [];
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
  // Apply theme from localStorage first, for logged-out users or initial load
  const savedTheme = localStorage.getItem("lyricTypeTheme") || "dark";
  applyTheme(savedTheme);

  // Check session first to see if user is already logged in
  checkSession().then(() => {
    fetchSongs(); // Then fetch songs
  });
  updateDifficultyLocks();

  setupEventListeners();
  setupScrollAnimations();
  initializeBackgroundAnimation();
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
                    ${
                      song.isCustom
                        ? '<div class="song-custom">📝 Custom</div>'
                        : ""
                    }
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
                `;
    // Check if the song has been completed
    if (completedSongTitles.includes(song.title)) {
      songCard.classList.add("song-card--completed");
    }

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

  populateAndShowStartModal(song);
}

function startTyping(song) {
  currentSong = song;
  currentWordIndex = 0;
  correctWords = 0;
  startTime = null;
  errorCount = 0;
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
        setTimeout(
          () => document.getElementById("typingArea").classList.remove("shake"),
          300
        );
      }
    }

    if (e.key === " ") {
      e.preventDefault();
      handleWordComplete();
    }
  });

  // Song Start Confirmation Modal
  document.getElementById("confirmStartBtn").addEventListener("click", () => {
    const songToStart = JSON.parse(document.body.dataset.songToStart || "{}");
    if (songToStart.title) {
      hideModal("songStartConfirmModal");
      setTimeout(() => {
        startTyping(songToStart);
      }, 300); // Short delay for modal to close
    }
  });
  document.getElementById("cancelStartBtn").addEventListener("click", () => {
    hideModal("songStartConfirmModal");
    // Clear selected song data
    delete document.body.dataset.songToStart;
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
  document
    .getElementById("showForgotPasswordBtn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      hideModal("loginModal");
      showModal("forgotPasswordModal");
    });
  document
    .getElementById("forgotPasswordSubmitBtn")
    .addEventListener("click", handleForgotPasswordRequest);
  document
    .getElementById("resetPasswordWithTokenSubmitBtn")
    .addEventListener("click", handlePasswordResetWithToken);

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
  document
    .getElementById("forgotPasswordModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "forgotPasswordModal")
        hideModal("forgotPasswordModal");
    });
  document
    .getElementById("resetPasswordWithTokenModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "resetPasswordWithTokenModal") {
        hideModal("resetPasswordWithTokenModal");
      }
    });
  document.getElementById("settingsModal").addEventListener("click", (e) => {
    if (e.target.id === "settingsModal") {
      hideModal("settingsModal");
    }
  });
  document.getElementById("tutorialModal").addEventListener("click", (e) => {
    if (e.target.id === "tutorialModal") {
      hideModal("tutorialModal");
    }
  });
  document
    .getElementById("songStartConfirmModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "songStartConfirmModal") {
        hideModal("songStartConfirmModal");
      }
    });

  // Add listeners for all modal close buttons
  document.querySelectorAll(".modal-close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = e.currentTarget.dataset.modalId;
      hideModal(modalId);
    });
  });

  // Training functionality
  document
    .getElementById("trainingBtn")
    .addEventListener("click", showTrainingMenu);
  document
    .getElementById("restartTrainingBtn")
    .addEventListener("click", restartTrainingLesson);
  document
    .getElementById("pauseTrainingBtn")
    .addEventListener("click", toggleTrainingPause);
  document
    .getElementById("restartTrainingFromModalBtn")
    .addEventListener("click", () => {
      hideModal("trainingCompletionModal");
      restartTrainingLesson();
    });
  document
    .getElementById("backToMenuFromModalBtn")
    .addEventListener("click", () => {
      hideModal("trainingCompletionModal");
      showTrainingMenu();
    });

  document
    .getElementById("backToTrainingMenu")
    .addEventListener("click", handleBackToTrainingMenu);
  document
    .getElementById("backToSongsFromMenu")
    .addEventListener("click", backToSongs);

  // Settings Modal
  document.getElementById("settingsBtn").addEventListener("click", () => {
    if (!currentUser) {
      showNotification("Please log in to access settings.", "info");
      showModal("loginModal");
      return;
    }
    showModal("settingsModal");
  });
  document
    .getElementById("closeSettingsBtn")
    .addEventListener("click", () => hideModal("settingsModal"));
  document
    .getElementById("theme-light-btn")
    .addEventListener("click", () => changeTheme("light"));
  document
    .getElementById("theme-dark-btn")
    .addEventListener("click", () => changeTheme("dark"));
  document
    .getElementById("resetPasswordBtn")
    .addEventListener("click", handleResetPassword);
  document.getElementById("deleteAccountBtn").addEventListener("click", () => {
    hideModal("settingsModal");
    showModal("deleteAccountConfirmModal");
  });
  document
    .getElementById("confirmDeleteAccountBtn")
    .addEventListener("click", handleDeleteAccount);
  document
    .getElementById("cancelDeleteAccountBtn")
    .addEventListener("click", () => hideModal("deleteAccountConfirmModal"));

  // Global keydown listener for training
  document.addEventListener("keydown", handleTrainingInput);

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

function showTutorialModal() {
  showModal("tutorialModal");
}

function hideTutorialModal() {
  hideModal("tutorialModal");
}

function showModal(modalId) {
  // Find and hide any currently open modal before showing a new one
  const currentModal = document.querySelector(".completion-modal.show");
  if (currentModal && currentModal.id !== modalId) {
    hideModal(currentModal.id);
  }

  document.getElementById(modalId).classList.add("show");
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
  // Reset all form elements within the modal to their default state
  const modal = document.getElementById(modalId);
  if (modal) {
    const formElements = modal.querySelectorAll("input, textarea, select");
    formElements.forEach((el) => {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = "";
      } else if (el.tagName === "SELECT") {
        el.selectedIndex = 0; // Reset to the first option
      }
    });
  }
}

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }
  updateThemeUI();
  initializeBackgroundAnimation();
}

function updateThemeUI() {
  const isLightMode = document.body.classList.contains("light-mode");
  const lightBtn = document.getElementById("theme-light-btn");
  const darkBtn = document.getElementById("theme-dark-btn");

  if (isLightMode) {
    lightBtn.classList.add("active");
    darkBtn.classList.remove("active");
  } else {
    darkBtn.classList.add("active");
    lightBtn.classList.remove("active");
  }
}

function changeTheme(newTheme) {
  applyTheme(newTheme);
  localStorage.setItem("lyricTypeTheme", newTheme);
  if (currentUser) saveUserThemePreference(newTheme);
}

function handleTyping(e) {
  // If paused, the first input should resume the game
  if (isPaused) {
    togglePause();
    showNotification("Game resumed!", "info");
    // The input event fires after this, so we don't need to process the character here.
    // But we need to prevent double-processing if the user types very fast.
    // The logic below handles the character input.
    return;
  }

  recordActivity();

  if (!startTime && !isPaused) {
    startTime = Date.now();
    startTimer();
    startInactivityTimer();
  }

  // This logic is now character-by-character, similar to training.
  // We use the input event's `data` property to get the last typed character.
  const typedChar = e.data;
  if (!typedChar || e.inputType === "deleteContentBackward") {
    // Handle backspace or other non-character inputs if needed in the future.
    // For now, we only process forward typing.
    return;
  }

  const currentWordEl = document.querySelector(
    `[data-index="${currentWordIndex}"]`
  );
  if (!currentWordEl) return;

  const originalWord = currentSong.lyrics.split(" ")[currentWordIndex];
  const charIndexInWord =
    document.getElementById("typingInput").value.length - 1;
  const expectedChar = originalWord[charIndexInWord];
  const charSpan = currentWordEl.querySelectorAll(".char")[charIndexInWord];

  totalCharsTyped++;

  if (!charSpan) {
    // User typed past the end of the word. This is an error.
    // correctChars is not incremented.
    const typingArea = document.getElementById("typingArea");
    errorSound.play();
    typingArea.classList.add("shake");
    setTimeout(() => typingArea.classList.remove("shake"), 400);
    updateStats();
    return;
  }

  if (typedChar === expectedChar) {
    correctChars++;
    charSpan.classList.add("correct");
    charSpan.classList.remove("incorrect");
  } else {
    // Incorrect character
    charSpan.classList.add("incorrect");
    charSpan.classList.remove("correct");
    // Shake the typing area to give visual feedback for the error
    errorSound.play();
    const typingArea = document.getElementById("typingArea");
    typingArea.classList.add("shake");
    setTimeout(() => typingArea.classList.remove("shake"), 400);
  }

  updateStats();
}

function handleWordComplete() {
  if (isTutorialRunning || isPaused) return; // Prevent advancing on pause or tutorial

  recordActivity();

  const input = document.getElementById("typingInput");
  const typedWord = input.value.trim();
  const words = currentSong.lyrics.split(" ");
  const originalWord = words[currentWordIndex];

  const currentWordEl = document.querySelector(
    `[data-index="${currentWordIndex}"]`
  );
  currentWordEl.classList.remove("current");

  // The error logic is now handled in `handleTyping`.
  // We just check if the final word is correct for word-level stats.
  // NEW: Also check for missing characters and count them as errors.
  if (typedWord !== originalWord) {
    currentWordEl.classList.add("incorrect");
    // If the word was submitted early (is shorter), count missing chars as errors.
    if (typedWord.length < originalWord.length) {
      const missingChars = originalWord.length - typedWord.length;
      totalCharsTyped += missingChars; // These are effectively "typed" incorrectly.
    }
  }
  if (typedWord === originalWord) {
    currentWordEl.classList.add("correct");
    correctWords++;
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
  // Count correct characters from completed words for WPM
  const completedWords = Array.from(document.querySelectorAll(".word.correct"));
  const wpmCorrectChars =
    completedWords.reduce((count, word) => count + word.innerText.length, 0) +
    completedWords.length; // Add spaces

  document.getElementById("errorsStat").textContent =
    totalCharsTyped - correctChars;

  const progress = Math.round((currentWordIndex / totalWords) * 100);

  document.getElementById("accuracyStat").textContent = accuracy + "%";
  document.getElementById("progressStat").textContent = progress + "%";
  document.getElementById("progressFill").style.width = progress + "%";

  if (startTime) {
    const timeElapsedSeconds = (Date.now() - startTime) / 1000;
    // Only calculate WPM after at least 2 seconds to avoid initial spikes
    if (timeElapsedSeconds >= 2) {
      const timeElapsedMinutes = timeElapsedSeconds / 60;
      // WPM is based on a standard of 5 characters per word
      const wpm = Math.round(wpmCorrectChars / 5 / timeElapsedMinutes) || 0;
      document.getElementById("wpmStat").textContent = wpm;
    }
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
    pauseStartTime = Date.now();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  } else {
    pauseBtn.textContent = "⏸️ Pause";
    if (pauseStartTime && startTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      startTime += pauseDuration; // Adjust start time to account for pause
      pauseStartTime = null;
    }
    typingInput.focus();
    recordActivity();
    startInactivityTimer();
  }
}

function restartSong() {
  isTutorialRunning = false; // Stop tutorial if running
  document.getElementById("completionModal").classList.remove("show");
  if (currentSong) {
    correctChars = 0; // Reset char count
    totalCharsTyped = 0;
    startTyping(currentSong);
  }
}

function backToSongs() {
  isTutorialRunning = false; // Stop tutorial if running
  closeAllModals();
  document.getElementById("typingArea").classList.remove("active");
  document.getElementById("songSelector").style.display = ""; // Use CSS to control display
  document.getElementById("trainingMenu").classList.remove("active");

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

  if (isTrainingActive) {
    stopTraining();
  }

  resetStats();

  // Re-render songs to show the newly completed one
  applyFilters();
}

function resetStats() {
  document.getElementById("wpmStat").textContent = "0";
  document.getElementById("accuracyStat").textContent = "100%";
  document.getElementById("progressStat").textContent = "0%";
  document.getElementById("errorsStat").textContent = "0";
  totalCharsTyped = 0;
  correctChars = 0;

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
  const timeElapsedMinutes = (Date.now() - startTime) / 1000 / 60;
  // Recalculate correct characters for final WPM
  const finalCorrectChars = Array.from(
    document.querySelectorAll(".word.correct")
  ).reduce((count, word) => count + word.innerText.length, 0);
  const wpm = Math.round(finalCorrectChars / 5 / timeElapsedMinutes) || 0;

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

  // Also save the score on timeout if the user is logged in
  if (currentUser) {
    saveScore({
      wpm,
      accuracy,
      errors: totalCharsTyped - correctChars,
      songTitle: currentSong.title,
      completed: false, // Mark as not completed due to timeout
      artist: currentSong.artist,
      difficulty: currentSong.difficulty,
    });
  }
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
  const timeElapsedMinutes = (Date.now() - startTime) / 1000 / 60;
  // Recalculate correct characters for final WPM
  const finalCorrectChars = Array.from(
    document.querySelectorAll(".word.correct")
  ).reduce((count, word) => count + word.innerText.length, 0);
  const wpm = Math.round(finalCorrectChars / 5 / timeElapsedMinutes) || 0;

  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  const timeBonus = timeRemaining > 0 ? Math.round(timeRemaining / 10) : 0;
  const score = {
    wpm,
    accuracy,
    errors: totalCharsTyped - correctChars,
    songTitle: currentSong.title,
    artist: currentSong.artist,
    difficulty: currentSong.difficulty,
  };

  // Check for completion requirements
  const wpmGoal = currentSong.minWpm || 0;
  const accuracyGoal = currentSong.minAccuracy || 0;
  const wpmMet = wpm >= wpmGoal;
  const accuracyMet = accuracy >= accuracyGoal;
  const allGoalsMet = wpmMet && accuracyMet;

  score.completed = allGoalsMet; // Set completion status based on goals

  let challengeHtml = `
    <div class="final-challenge ${
      allGoalsMet ? "final-challenge--success" : "final-challenge--danger"
    }">
      <strong>Challenge:</strong> ${currentSong.difficulty.toUpperCase()} completed!
    </div>`;

  if (wpmGoal > 0 || accuracyGoal > 0) {
    challengeHtml = `
      <div class="final-challenge ${
        allGoalsMet ? "final-challenge--success" : "final-challenge--danger"
      }">
        <strong>WPM Goal:</strong> ${wpmGoal} (${wpmMet ? "Met" : "Missed"})<br>
        <strong>Accuracy Goal:</strong> ${accuracyGoal}% (${
      accuracyMet ? "Met" : "Missed"
    })
      </div>`;
  }

  document.getElementById("finalStats").innerHTML = `
        <div class="final-block">
          <div class="final-title ${
            allGoalsMet ? "final-title--success" : "final-title--danger"
          }">
            ${allGoalsMet ? "🎉 Challenge Complete!" : "❌ Challenge Failed!"}
          </div>
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
          ${challengeHtml}
        </div>
      `;

  document.getElementById("completionModal").classList.add("show");

  // If user is logged in, save the score
  if (currentUser) {
    saveScore(score);
    // Only count towards unlocks if all goals were met
    if (allGoalsMet) {
      userCompletionProgress[currentSong.difficulty]++;
      currentUser.completedSongs = userCompletionProgress;
      if (!completedSongTitles.includes(currentSong.title))
        completedSongTitles.push(currentSong.title);
      updateDifficultyLocks();
    }
  }
}

function handleSearch() {
  applyFilters();
}

function handleDifficultyFilter(e) {
  // Use class toggles for active state so styles live in CSS
  const btn = e.currentTarget || e.target;
  const difficulty = btn.dataset.difficulty;

  // Check if the difficulty is locked
  const mediumUnlocked = userCompletionProgress.easy >= 5;
  const hardUnlocked = userCompletionProgress.medium >= 5;

  if (difficulty === "medium" && !mediumUnlocked) {
    showNotification(
      `Complete ${
        5 - userCompletionProgress.easy
      } more Easy song(s) to unlock Medium!`,
      "info"
    );
    return;
  }
  if (difficulty === "hard" && !hardUnlocked) {
    showNotification(
      `Complete ${
        5 - userCompletionProgress.medium
      } more Medium song(s) to unlock Hard!`,
      "info"
    );
    return;
  }

  document
    .querySelectorAll(".difficulty-filter")
    .forEach((btn) => btn.classList.remove("active"));
  btn.classList.add("active");

  // Update current filter and apply
  currentDifficultyFilter = difficulty;
  applyFilters();
}

function updateDifficultyLocks() {
  const mediumBtn = document.querySelector(
    '.difficulty-filter[data-difficulty="medium"]'
  );
  const hardBtn = document.querySelector(
    '.difficulty-filter[data-difficulty="hard"]'
  );

  const mediumUnlocked = currentUser && userCompletionProgress.easy >= 5;
  const hardUnlocked = currentUser && userCompletionProgress.medium >= 5;

  mediumBtn.classList.toggle("locked", !mediumUnlocked);
  hardBtn.classList.toggle("locked", !hardUnlocked);
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

function populateAndShowStartModal(song) {
  document.getElementById("confirmSongTitle").textContent = song.title;
  document.getElementById(
    "confirmSongArtist"
  ).textContent = `by ${song.artist}`;

  const challengeBody = document.getElementById("songChallengeBody");
  const wpmGoal = song.minWpm;
  const accuracyGoal = song.minAccuracy;

  let challengeHtml =
    "<p>Type the lyrics as fast and accurately as you can!</p>";

  if (wpmGoal || accuracyGoal) {
    challengeHtml = `
      <div class="challenge-list">
        <h3>🏆 Song Challenges</h3>
        <ul>
    `;
    if (wpmGoal) {
      challengeHtml += `<li>Speed Goal: <strong>${wpmGoal} WPM</strong> or higher</li>`;
    }
    if (accuracyGoal) {
      challengeHtml += `<li>Accuracy Goal: <strong>${accuracyGoal}%</strong> or higher</li>`;
    }
    challengeHtml += "</ul></div>";
  }

  challengeBody.innerHTML = challengeHtml;
  document.body.dataset.songToStart = JSON.stringify(song);
  showModal("songStartConfirmModal");
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
    // Fetch both song scores and training scores in parallel
    const [scoresResponse, trainingScoresResponse] = await Promise.all([
      fetch("/api/scores"),
      fetch("/api/training-scores"),
    ]);

    if (!scoresResponse.ok || !trainingScoresResponse.ok) {
      profileBody.innerHTML =
        '<div class="empty-message">Could not load profile. Please try again.</div>';
      return;
    }
    const songScores = await scoresResponse.json();
    const trainingScores = await trainingScoresResponse.json();
    renderProfile(songScores, trainingScores);
  } catch (error) {
    profileBody.innerHTML =
      '<div class="empty-message">Error loading profile.</div>';
  }
}

function renderProfile(songScores, trainingScores) {
  const profileBody = document.getElementById("profileBody");
  if (songScores.length === 0 && trainingScores.length === 0) {
    profileBody.innerHTML =
      '<div class="empty-message">You haven\'t completed any songs yet. Go type!</div>';
    return;
  }

  // --- Find Best Scores ---
  // Find the single best score for songs based on highest WPM.
  // Since scores are sorted by date, this will favor the most recent in case of a tie.
  const bestSongScore = songScores.reduce(
    (best, current) => (!best || current.wpm >= best.wpm ? current : best),
    null
  );

  // Find the single best score for training lessons.
  const bestTrainingScore = trainingScores.reduce(
    (best, current) => (!best || current.wpm >= best.wpm ? current : best),
    null
  );
  // --- End Find Best Scores ---

  const avgWpm = Math.round(
    songScores.reduce((sum, s) => sum + s.wpm, 0) / (songScores.length || 1)
  );
  const avgAccuracy = Math.round(
    songScores.reduce((sum, s) => sum + s.accuracy, 0) /
      (songScores.length || 1)
  );

  const songScoresHtml = songScores
    .map((score) => {
      const isBest = bestSongScore && score._id === bestSongScore._id;
      return `
    <tr>
      <td>
        <span class="song-title-small">${score.songTitle}</span>
        <span class="artist-small">by ${score.artist}</span>
      </td>
      <td>${score.wpm} ${
        isBest ? '<span class="best-score-badge">🏆 Best</span>' : ""
      }</td>
      <td>${score.accuracy}%</td>
      <td>${score.errors ?? "N/A"}</td>
      <td>${new Date(score.date).toLocaleDateString()}</td>
    </tr>
  `;
    })
    .join("");

  const trainingScoresHtml = trainingScores
    .map((score) => {
      const isBest = bestTrainingScore && score._id === bestTrainingScore._id;
      return `
    <tr>
      <td>${score.lessonTitle}</td>
      <td>${score.wpm} ${
        isBest ? '<span class="best-score-badge">🏆 Best</span>' : ""
      }</td>
      <td>${score.accuracy}%</td>
      <td>${score.errors}</td>
      <td>${new Date(score.date).toLocaleDateString()}</td>
    </tr>
  `;
    })
    .join("");

  profileBody.innerHTML = `
    <div class="profile-stats-grid">
      <div class="profile-stat-card"><div class="profile-stat-value">${avgWpm}</div><div class="profile-stat-label">Avg. WPM</div></div>
      <div class="profile-stat-card"><div class="profile-stat-value">${avgAccuracy}%</div><div class="profile-stat-label">Avg. Accuracy</div></div>
      <div class="profile-stat-card"><div class="profile-stat-value">${
        songScores.length
      }</div><div class="profile-stat-label">Songs Typed</div></div>
    </div>
    <div class="profile-history">
      <h3>Recent Song Activity</h3>
      <table class="profile-scores-table">
        <thead><tr><th>Song</th><th>WPM</th><th>Accuracy</th><th>Errors</th><th>Date</th></tr></thead>
        <tbody>
          ${
            songScoresHtml ||
            '<tr><td colspan="5">No songs completed yet.</td></tr>'
          }
        </tbody>
      </table>
    </div>
    <div class="profile-history">
      <h3>Training History</h3>
      <table class="profile-scores-table">
        <thead><tr><th>Lesson</th><th>WPM</th><th>Accuracy</th><th>Errors</th><th>Date</th></tr></thead>
        <tbody>
          ${
            trainingScoresHtml ||
            '<tr><td colspan="5">No lessons completed yet.</td></tr>'
          }
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
      completedSongTitles = currentUser.completedSongTitles || [];
      updateUserUI();
      trainingProgress = currentUser.trainingProgress || 0;
      applyTheme(currentUser.themePreference || "dark"); // Apply user's theme on login
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
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
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
    trainingProgress = 0; // Reset local progress on logout
    updateUserUI();
    completedSongTitles = [];
    userCompletionProgress = { easy: 0, medium: 0, hard: 0 };
    updateDifficultyLocks();
    // If a difficulty was selected, clear it
    currentDifficultyFilter = null;
    applyFilters();
  } catch (error) {
    showNotification("Logout failed.", "error");
  }
}

async function saveUserThemePreference(theme) {
  try {
    await fetch("/api/user/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch (error) {
    console.error("Failed to save theme preference:", error);
    // This is a non-critical error, so we don't need to notify the user.
    // The preference is already saved in localStorage as a fallback.
  }
}

async function handleResetPassword() {
  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword =
    document.getElementById("confirmNewPassword").value;

  if (!oldPassword || !newPassword || !confirmNewPassword) {
    showNotification("Please fill all password fields.", "error");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showNotification("New passwords do not match.", "error");
    return;
  }

  try {
    const response = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await response.json();
    if (response.ok) {
      showNotification(
        "Password updated! Please log in with your new password.",
        "success"
      );
      hideModal("settingsModal");
      // The backend now handles session destruction. We just need to update the UI.
      currentUser = null;
      trainingProgress = 0;
      completedSongTitles = [];
      userCompletionProgress = { easy: 0, medium: 0, hard: 0 };
      updateUserUI();
      // Show login modal so user can log back in
      showModal("loginModal");
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Error updating password. Please try again.", "error");
  }
}

async function handleForgotPasswordRequest() {
  const email = document.getElementById("forgotEmail").value;
  if (!email) {
    showNotification("Please enter your email address.", "error");
    return;
  }

  try {
    const response = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (response.ok) {
      hideModal("forgotPasswordModal");
      // Store the email and show the next modal
      document.body.dataset.resetEmail = email;
      showModal("resetPasswordWithTokenModal");
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("An error occurred. Please try again.", "error");
  }
}

async function handlePasswordResetWithToken() {
  const token = document.getElementById("resetTokenInput").value;
  const password = document.getElementById("resetTokenPassword").value;
  const confirmPassword = document.getElementById(
    "resetTokenConfirmPassword"
  ).value;
  const email = document.body.dataset.resetEmail;

  if (!token) {
    showNotification("Please enter the 6-digit reset code.", "error");
    return;
  }
  if (!password || !confirmPassword) {
    showNotification("Please fill in both password fields.", "error");
    return;
  }
  if (password !== confirmPassword) {
    showNotification("Passwords do not match.", "error");
    return;
  }

  try {
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      hideModal("resetPasswordWithTokenModal");
      showNotification(data.message, "success");
      showModal("loginModal");
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification(
      "An error occurred while resetting your password.",
      "error"
    );
  }
}

async function handleDeleteAccount() {
  const password = document.getElementById("deleteConfirmPassword").value;
  if (!password) {
    showNotification(
      "Please enter your password to confirm deletion.",
      "error"
    );
    return;
  }

  try {
    const response = await fetch("/api/user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(
        "Account deleted successfully. You have been logged out.",
        "success"
      );
      hideModal("deleteAccountConfirmModal");
      // Effectively log out the user
      currentUser = null;
      trainingProgress = 0;
      completedSongTitles = [];
      userCompletionProgress = { easy: 0, medium: 0, hard: 0 };
      updateUserUI();
      backToSongs(); // Go back to main screen
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    showNotification("Error deleting account. Please try again.", "error");
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
    updateDifficultyLocks();
  } else {
    icon.textContent = "👤";
    text.textContent = "Login";
    profileBtnContainer.style.display = "none";
    updateDifficultyLocks();
  }
}

function handleBackToTrainingMenu() {
  // Clear any running timers and reset state before going to menu
  if (trainingTimer) clearInterval(trainingTimer);
  if (trainingInactivityTimer) clearTimeout(trainingInactivityTimer);
  trainingTimer = null;
  trainingInactivityTimer = null;
  showTrainingMenu();
}

function showTrainingMenu() {
  if (!currentUser) {
    showNotification("Please log in to access the training section.", "info");
    showModal("loginModal");
    return;
  }

  closeAllModals();
  document.getElementById("songSelector").style.display = "none";
  document.getElementById("typingArea").classList.remove("active");
  document.getElementById("trainingArea").classList.remove("active");
  document.getElementById("trainingMenu").classList.add("active");
  document.body.classList.add("sidebar-collapsed");
  isTrainingActive = false; // Not in a drill, just in the menu
  clearKeyHighlights();
  renderLessons();
}

function renderLessons() {
  const lessonGrid = document.getElementById("lessonGrid");
  lessonGrid.innerHTML = "";
  // trainingProgress is now loaded from the user's profile on login

  trainingLessons.forEach((lesson, index) => {
    const card = document.createElement("div");
    card.className = "lesson-card";
    const minutes = Math.floor(lesson.timeLimit / 60);
    const seconds = lesson.timeLimit % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    card.innerHTML = `
      <h3>${lesson.title}</h3>
      <div class="lesson-time">🕒 ${timeString}</div>
    `;

    if (index > trainingProgress) {
      card.classList.add("locked");
      card.innerHTML += "<span>🔒 Locked</span>";
    } else {
      if (index < trainingProgress) {
        card.classList.add("completed");
        card.innerHTML += "<span>✔️ Completed</span>";
      }
      card.addEventListener("click", () => startLesson(index));
    }
    lessonGrid.appendChild(card);
  });
}

function startLesson(lessonIndex) {
  closeAllModals();
  currentLessonIndex = lessonIndex;
  currentDrillIndex = 0;
  startDrill();
  trainingCorrectChars = 0;
  trainingTotalChars = 0;
}

function closeAllModals() {
  const openModals = document.querySelectorAll(".completion-modal.show");
  openModals.forEach((modal) => {
    // We use the hideModal function to ensure input fields are cleared correctly
    hideModal(modal.id);
  });
}

function startDrill() {
  isTrainingActive = true;
  currentTrainingCharIndex = 0;
  isTrainingPaused = false;

  document.getElementById("trainingMenu").classList.remove("active");
  document.getElementById("trainingArea").classList.add("active");
  document.getElementById("pauseTrainingBtn").textContent = "⏸️ Pause";

  loadDrill();
  resetTrainingStatsDisplay();
}

function stopTraining() {
  isTrainingActive = false;
  document.getElementById("trainingMenu").classList.remove("active");
  document.getElementById("trainingArea").classList.remove("active");
  document.getElementById("songSelector").style.display = "";
  document.body.classList.remove("sidebar-collapsed");
  clearKeyHighlights();
  if (trainingTimer) {
    clearInterval(trainingTimer);
    trainingTimer = null;
  }
  if (trainingInactivityTimer) {
    clearTimeout(trainingInactivityTimer);
    trainingInactivityTimer = null;
  }
}

function loadDrill() {
  const lesson = trainingLessons[currentLessonIndex];
  if (currentDrillIndex >= lesson.drills.length) {
    return completeTrainingLesson();
  }

  const drill = lesson.drills[currentDrillIndex];
  document.getElementById("trainingInstructions").textContent =
    drill.instruction;
  const trainingTextDisplay = document.getElementById("trainingTextDisplay");

  trainingTextDisplay.innerHTML = drill.text
    .split("")
    .map((char) => `<span class="training-char">${char}</span>`)
    .join("");

  currentTrainingCharIndex = 0;
  updateTrainingHighlight();
}

function handleTrainingInput(e) {
  if (!isTrainingActive) return;

  // If paused, the first keypress should resume the training
  if (isTrainingPaused) {
    toggleTrainingPause();
    showNotification("Training resumed!", "info");
  }

  recordTrainingActivity();

  if (isTrainingActive && !trainingStartTime) {
    trainingStartTime = Date.now();
    startTrainingTimer();
    startTrainingInactivityTimer();
  }

  e.preventDefault(); // Prevent default browser actions like search on '/'

  const lesson = trainingLessons[currentLessonIndex];
  const drill = lesson.drills[currentDrillIndex];
  const expectedChar = drill.text[currentTrainingCharIndex];
  const typedKey = e.key;

  const charElements = document.querySelectorAll(".training-char");
  const currentCharEl = charElements[currentTrainingCharIndex];

  if (typedKey === expectedChar) {
    currentCharEl.classList.remove("current", "incorrect");
    currentCharEl.classList.add("correct");
    trainingCorrectChars++;
    currentTrainingCharIndex++;

    if (currentTrainingCharIndex >= drill.text.length) {
      // Drill complete, move to next
      currentDrillIndex++;
      setTimeout(startDrill, 500); // Wait half a second before loading next drill
    } else {
      updateTrainingHighlight();
    }
  } else {
    // Incorrect key
    currentCharEl.classList.add("incorrect");
    errorSound.play();
    flashKeyError(typedKey);
  }
  if (typedKey !== "Shift" && typedKey !== "Control" && typedKey !== "Alt") {
    updateTrainingStats();
  }
}

function startTrainingTimer() {
  const lesson = trainingLessons[currentLessonIndex];
  trainingTimeRemaining = lesson.timeLimit;

  if (trainingTimer) clearInterval(trainingTimer);

  trainingTimer = setInterval(() => {
    if (isTrainingActive && !isTrainingPaused) {
      updateTimerDisplay();
    }
  }, 1000);
}

function trainingTimeUp() {
  if (trainingTimer) {
    clearInterval(trainingTimer);
    trainingTimer = null;
  }
  if (trainingInactivityTimer) {
    clearTimeout(trainingInactivityTimer);
    trainingInactivityTimer = null;
  }
  isTrainingActive = false;
  clearKeyHighlights();

  // Get final stats and show modal
  const lesson = trainingLessons[currentLessonIndex];
  const finalWpm = document.getElementById("trainingWpmStat").textContent;
  const finalAccuracy = document.getElementById(
    "trainingAccuracyStat"
  ).textContent;
  const finalErrors = document.getElementById("trainingErrorsStat").textContent;

  const finalStatsEl = document.getElementById("trainingFinalStats");
  finalStatsEl.innerHTML = `
    <div class="final-subtitle">${lesson.title}</div>
    <div class="final-grid">
      <div><strong>Speed:</strong> ${finalWpm} WPM</div>
      <div><strong>Accuracy:</strong> ${finalAccuracy}</div>
      <div><strong>Errors:</strong> ${finalErrors}</div>
    </div>
  `;

  document.querySelector("#trainingCompletionModal h2").textContent =
    "⏰ Time's Up!";
  showModal("trainingCompletionModal");

  // Save the score for the timed-out attempt
  if (currentUser) {
    const scoreData = {
      lessonTitle: lesson.title,
      wpm: parseInt(finalWpm) || 0,
      accuracy: parseInt(finalAccuracy) || 0,
      errors: parseInt(finalErrors) || 0,
    };
    saveTrainingScore(scoreData);
  }
}

function recordTrainingActivity() {
  resetTrainingInactivityTimer();
}

function startTrainingInactivityTimer() {
  if (trainingInactivityTimer) clearTimeout(trainingInactivityTimer);
  trainingInactivityTimer = setTimeout(() => {
    if (isTrainingActive && !isTrainingPaused) {
      autoPauseTraining();
    }
  }, TRAINING_INACTIVITY_TIMEOUT);
}

function resetTrainingInactivityTimer() {
  if (trainingInactivityTimer) clearTimeout(trainingInactivityTimer);
  if (isTrainingActive && !isTrainingPaused) {
    startTrainingInactivityTimer();
  }
}

function autoPauseTraining() {
  if (!isTrainingPaused) {
    toggleTrainingPause();
    showNotification("Training paused due to inactivity.", "info");
  }
}

function toggleTrainingPause() {
  isTrainingPaused = !isTrainingPaused;
  const pauseBtn = document.getElementById("pauseTrainingBtn");

  if (isTrainingPaused) {
    pauseBtn.textContent = "▶️ Resume";
    trainingPauseStartTime = Date.now();
    if (trainingInactivityTimer) clearTimeout(trainingInactivityTimer);
  } else {
    pauseBtn.textContent = "⏸️ Pause";
    if (trainingPauseStartTime && trainingStartTime) {
      const pauseDuration = Date.now() - trainingPauseStartTime;
      trainingStartTime += pauseDuration; // Adjust start time to account for pause
      trainingPauseStartTime = null;
    }
    recordTrainingActivity(); // Restart inactivity timer on resume
  }
}

function restartTrainingLesson() {
  if (trainingTimer) clearInterval(trainingTimer);
  if (trainingInactivityTimer) clearTimeout(trainingInactivityTimer);
  trainingTimer = null;
  trainingStartTime = null; // Reset lesson start time
  trainingCorrectChars = 0;
  trainingTotalChars = 0;
  startLesson(currentLessonIndex);
}

function completeTrainingLesson() {
  isTrainingActive = false;
  if (trainingTimer) clearInterval(trainingTimer);
  if (trainingInactivityTimer) clearTimeout(trainingInactivityTimer);
  trainingTimer = null;
  trainingInactivityTimer = null;

  const lesson = trainingLessons[currentLessonIndex];
  const finalWpm = document.getElementById("trainingWpmStat").textContent;
  const finalAccuracy = document.getElementById(
    "trainingAccuracyStat"
  ).textContent;
  const finalErrors = document.getElementById("trainingErrorsStat").textContent;

  // Ensure modal title is correct for completion
  document.querySelector("#trainingCompletionModal h2").textContent =
    "🎉 Lesson Complete!";

  const finalStatsEl = document.getElementById("trainingFinalStats");
  finalStatsEl.innerHTML = `
    <div class="final-subtitle">${lesson.title}</div>
    <div class="final-grid">
      <div><strong>Speed:</strong> ${finalWpm} WPM</div>
      <div><strong>Accuracy:</strong> ${finalAccuracy}</div>
      <div><strong>Errors:</strong> ${finalErrors}</div>
    </div>
  `;

  showModal("trainingCompletionModal");

  // Unlock next lesson
  if (currentLessonIndex === trainingProgress) {
    trainingProgress++;
    saveUserTrainingProgress(trainingProgress);
  }

  // Save score if logged in
  if (currentUser) {
    const scoreData = {
      lessonTitle: lesson.title,
      wpm: parseInt(finalWpm) || 0,
      accuracy: parseInt(finalAccuracy) || 0,
      errors: parseInt(finalErrors) || 0,
    };
    saveTrainingScore(scoreData);
  }
}

async function saveUserTrainingProgress(progress) {
  if (!currentUser) return;
  try {
    await fetch("/api/user/training-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
  } catch (error) {
    console.error("Failed to save user training progress:", error);
  }
}

async function saveTrainingScore(scoreData) {
  try {
    await fetch("/api/training-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scoreData),
    });
  } catch (error) {
    console.error("Failed to save training score:", error);
  }
}

function updateTimerDisplay() {
  const lesson = trainingLessons[currentLessonIndex];
  if (!trainingStartTime || !lesson) return;

  const elapsed = Math.floor((Date.now() - trainingStartTime) / 1000);
  trainingTimeRemaining = Math.max(0, lesson.timeLimit - elapsed);

  const minutes = Math.floor(trainingTimeRemaining / 60);
  const seconds = trainingTimeRemaining % 60;

  const timeDisplay = document.getElementById("trainingInstructions");
  const drill = lesson.drills[currentDrillIndex];
  const instructionText = drill ? drill.instruction : "Loading...";

  timeDisplay.innerHTML = `${instructionText} <br> <strong>Time: ${minutes}:${seconds
    .toString()
    .padStart(2, "0")}</strong>`;

  if (trainingTimeRemaining <= 0) {
    trainingTimeUp();
  }
}

function updateTrainingHighlight() {
  const charElements = document.querySelectorAll(".training-char");
  charElements.forEach((el, index) => {
    el.classList.remove("current");
    if (index === currentTrainingCharIndex) {
      el.classList.add("current");
    }
  });

  const nextChar =
    trainingLessons[currentLessonIndex].drills[currentDrillIndex].text[
      currentTrainingCharIndex
    ];
  highlightKey(nextChar);
}

function updateTrainingStats() {
  trainingTotalChars++;

  const accuracy = Math.round(
    (trainingCorrectChars / trainingTotalChars) * 100
  );
  document.getElementById("trainingAccuracyStat").textContent = `${accuracy}%`;

  const errors = trainingTotalChars - trainingCorrectChars;
  document.getElementById("trainingErrorsStat").textContent = errors;

  if (trainingStartTime) {
    const timeElapsedSeconds = (Date.now() - trainingStartTime) / 1000;

    // Only calculate WPM after at least 2 seconds to avoid initial spikes
    if (timeElapsedSeconds >= 2) {
      const timeElapsedMinutes = timeElapsedSeconds / 60;
      // WPM is based on a standard of 5 characters per word
      const wpm =
        Math.round(trainingCorrectChars / 5 / timeElapsedMinutes) || 0;
      document.getElementById("trainingWpmStat").textContent = wpm;
    }
  }
}

function resetTrainingStatsDisplay() {
  document.getElementById("trainingWpmStat").textContent = "0";
  document.getElementById("trainingAccuracyStat").textContent = "100%";
  document.getElementById("trainingErrorsStat").textContent = "0";
}

function highlightKey(char) {
  clearKeyHighlights();
  document
    .querySelectorAll(".finger.highlight")
    .forEach((f) => f.classList.remove("highlight"));

  // Check for shifted characters
  const shiftKeys = '`~!@#$%^&*()_+{}|:"<>?';
  if ((char >= "A" && char <= "Z") || shiftKeys.includes(char)) {
    const shiftKeyEl = document.querySelector(`.key[data-key="ShiftLeft"]`);
    if (shiftKeyEl) shiftKeyEl.classList.add("highlight");
  }

  // Map special characters to their base key
  const keyMap = {
    "~": "`",
    "!": "1",
    "@": "2",
    "#": "3",
    $: "4",
    "%": "5",
    "^": "6",
    "&": "7",
    "*": "8",
    "(": "9",
    ")": "0",
    _: "-",
    "+": "=",
    "{": "[",
    "}": "]",
    "|": "\\",
    ":": ";",
    '"': "'",
    "<": ",",
    ">": ".",
    "?": "/",
  };
  const baseChar = keyMap[char] || char.toLowerCase();

  const keyEl = document.querySelector(`.key[data-key="${baseChar}"]`);
  if (keyEl) {
    keyEl.classList.add("highlight");

    // Highlight the corresponding finger
    const fingerClass = Array.from(keyEl.classList).find((c) =>
      c.startsWith("finger-")
    );
    if (fingerClass) {
      // For spacebar, default to left thumb, but highlight both
      const fingerId = fingerClass.includes("thumb")
        ? "finger-left-thumb"
        : fingerClass;
      const fingerEl = document.getElementById(fingerId);
      if (fingerEl) {
        fingerEl.classList.add("highlight");
        // Also highlight the other thumb for the spacebar
        if (fingerId === "finger-left-thumb") {
          document
            .getElementById("finger-right-thumb")
            .classList.add("highlight");
        }
      }
    }
  }
}

function clearKeyHighlights() {
  document
    .querySelectorAll(".key.highlight")
    .forEach((k) => k.classList.remove("highlight"));
}

function flashKeyError(key) {
  const keyEl = document.querySelector(`.key[data-key="${key.toLowerCase()}"]`);
  if (keyEl) {
    keyEl.classList.add("error-flash");
    setTimeout(() => keyEl.classList.remove("error-flash"), 300);
  }
}

// --- Background Particle Animation ---
let animationFrameId;
let animationIntervalId; // For controlling frame rate

function initializeBackgroundAnimation() {
  if (animationIntervalId) clearInterval(animationIntervalId);

  const canvas = document.getElementById("background-animation");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const setCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  setCanvasSize();
  window.addEventListener("resize", setCanvasSize);

  const isLightMode = document.body.classList.contains("light-mode");
  const backgroundColor = isLightMode
    ? "rgba(244, 247, 249, 0.1)"
    : "rgba(33, 38, 46, 0.1)";
  const characterColor = isLightMode ? "rgba(9, 153, 9, 0.7)" : "#00aaff";

  const characters = "abcdefghijklmnopqrstuvwxyz1234567890";
  const fontSize = 16;
  const columns = Math.floor(canvas.width / fontSize);

  const drops = [];
  for (let x = 0; x < columns; x++) {
    drops[x] = Math.floor(Math.random() * (canvas.height / fontSize));
  }

  function draw() {
    // Draw a semi-transparent rectangle to create the fading trail effect
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = characterColor;
    ctx.font = `${fontSize}px "Courier New", monospace`;

    for (let i = 0; i < drops.length; i++) {
      // Get a random character
      const text = characters[Math.floor(Math.random() * characters.length)];

      // Draw the character
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      // Reset drop to the top randomly after it goes off-screen
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      // Increment y-coordinate
      drops[i]++;
    }
  }

  // Use setInterval to control the frame rate, making it less CPU intensive
  animationIntervalId = setInterval(draw, 100);
}

// Initialize the app
initializeApp();
