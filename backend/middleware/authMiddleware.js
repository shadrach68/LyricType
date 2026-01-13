// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\middleware\authMiddleware.js
export const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized: You must be logged in." });
  }
};
