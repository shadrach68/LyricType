// c:\Users\ugwokeshadrachchinwe\Desktop\projects\lyricType\backend\routes\feedback.js
import express from "express";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { feedbackCollection } from "../database.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import "dotenv/config";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get all feedback (Protected: requires login)
router.get("/api/feedback", isAuthenticated, async (req, res) => {
  const feedback = await feedbackCollection()
    .find({})
    .sort({ date: -1 })
    .toArray();
  res.json(feedback);
});

// Post feedback (Protected: requires login)
router.post("/api/feedback", isAuthenticated, async (req, res) => {
  const { message, rating } = req.body;
  if (!message || !rating)
    return res
      .status(400)
      .json({ message: "Message and rating are required" });

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

// Reply to feedback (Protected: requires login and admin)
router.post("/api/feedback/:id/reply", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!req.session.user.isAdmin) {
    return res.status(403).json({ message: "Unauthorized: Admin access required." });
  }

  if (!reply) {
    return res.status(400).json({ message: "Reply content is required." });
  }

  try {
    await feedbackCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { reply, replyDate: new Date() } }
    );
    res.json({ message: "Reply posted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to post reply." });
  }
});

// Contact Form Endpoint
router.post("/api/contact", isAuthenticated, async (req, res) => {
  const { name, message } = req.body;
  const email = req.session.user.email;

  if (!name || !message) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }

  try {
    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      to: "lyrictype.app@gmail.com",
      replyTo: email,
      subject: `Contact Form Submission: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
          <h3>New Contact Message</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
});

export default router;
