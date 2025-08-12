const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// اتصال مع قاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch(err => console.error("MongoDB connection error:", err));

// نموذج تعليق (تعديل: إضافة pageId)
const CommentSchema = new mongoose.Schema({
  name: String,
  message: String,
  pageId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  approved: { type: Boolean, default: true },
  reply: {
    message: String,
    repliedAt: Date,
  },
});
const Comment = mongoose.model("Comment", CommentSchema);

// نموذج جديد للتقييم (Rating Schema)
const RatingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  pageId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Rating = mongoose.model("Rating", RatingSchema);

/// ====== Route 1: استلام نموذج التواصل (لا يوجد تغيير هنا) ======
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Website Contact" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      subject: "New Contact Message",
      html: `
        <h3>New Message from ${name}</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `,
    });

    res.status(200).json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("❌ Email sending error:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

/// ====== Route 2: إضافة تعليق (لا يوجد تغيير هنا) ======
app.post("/comments", async (req, res) => {
  const { name, message, pageId } = req.body;
  if (!name || !message || !pageId) {
    return res.status(400).json({ success: false, message: "Name, message, and pageId are required." });
  }
  const comment = new Comment({ name, message, pageId });
  try {
    await comment.save();
    console.log("New comment saved:", comment);
    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("Error saving comment:", err);
    res.status(500).json({ success: false, message: "Failed to save comment" });
  }
});

/// ====== Route 3: جلب التعليقات (تعديل: جعل pageId اختياريًا) ======
app.get("/comments", async (req, res) => {
  try {
    const { pageId } = req.query;
    let query = {};
    if (pageId) { // <--- لم نعد نطلب pageId بشكل إجباري
      query = { pageId: pageId };
    }
    const comments = await Comment.find(query).sort({ createdAt: -1 }); // <--- استخدام كويري مرن
    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ success: false, message: "Failed to fetch comments" });
  }
});

/// ====== Route 4: الرد على تعليق (لا يوجد تغيير هنا) ======
app.post("/comments/:id/reply", async (req, res) => {
  const { message } = req.body;
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.reply = {
      message,
      repliedAt: new Date(),
    };
    await comment.save();
    res.json({ success: true, comment });
  } catch (err) {
    console.error("Error replying to comment:", err);
    res.status(500).json({ success: false, message: "Failed to reply to comment" });
  }
});

/// ====== Route 5: حذف تعليق (لا يوجد تغيير هنا) ======
app.delete("/comments/:id", async (req, res) => {
  try {
    const result = await Comment.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: "Comment not found" });
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ success: false, message: "Failed to delete comment" });
  }
});

// --- 🌟 Route 6: إضافة تقييم جديد (لا يوجد تغيير هنا) 🌟 ---
app.post("/ratings", async (req, res) => {
  const { name, rating, pageId } = req.body;

  if (rating === undefined || rating < 1 || rating > 5 || !pageId) {
    return res.status(400).json({ success: false, message: "Name, rating (1-5), and pageId are required." });
  }

  const newRating = new Rating({ name, rating, pageId });
  try {
    await newRating.save();
    console.log("New rating saved:", newRating);
    res.status(201).json({ success: true, rating: newRating });
  } catch (err) {
    console.error("Error saving rating:", err);
    res.status(500).json({ success: false, message: "Failed to save rating." });
  }
});

// --- 🌟 Route 7: جلب متوسط التقييم وعدد التقييمات (تعديل: جعل pageId اختياريًا) 🌟 ---
app.get("/ratings/average", async (req, res) => {
  try {
    const { pageId } = req.query; // <--- استقبال pageId من query parameter
    let matchQuery = {};
    if (pageId) { // <--- لم نعد نطلب pageId بشكل إجباري. إذا وُجد، فلتر به
      matchQuery = { pageId: pageId };
    }

    const result = await Rating.aggregate([
      { $match: matchQuery }, // تطبيق الفلترة حسب pageId (إذا وُجد)
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (result.length > 0) {
      res.json({ average: parseFloat(result[0].averageRating.toFixed(1)), count: result[0].count });
    } else {
      // إذا لم تكن هناك تقييمات (أو تقييمات للصفحة المحددة)، أعد متوسط 0 وعدد 0
      res.json({ average: 0, count: 0 });
    }
  } catch (err) {
    console.error("Error calculating average rating:", err);
    res.status(500).json({ success: false, message: "Failed to fetch average rating." });
  }
});

// ------------------------------------------------------

// ====== Route 8: جلب جميع التقييمات (تعديل: يمكن فلترتها بـ pageId أو جلب الكل) ======
// هذا المسار كان صحيحاً بالفعل في تعاملك مع pageId
app.get("/ratings", async (req, res) => {
  try {
    const { pageId } = req.query;
    let query = {};
    if (pageId) {
      query = { pageId: pageId };
    }
    const ratings = await Rating.find(query).sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    console.error("Error fetching all ratings:", err);
    res.status(500).json({ success: false, message: "Failed to fetch all ratings." });
  }
});

// ====== Route 9: تصفير جميع التقييمات (لا يوجد تغيير هنا) ======
app.delete("/ratings/reset", async (req, res) => {
  try {
    await Rating.deleteMany({});
    res.status(200).json({ success: true, message: "All ratings have been reset successfully." });
  } catch (err) {
    console.error("Error resetting ratings:", err);
    res.status(500).json({ success: false, message: "Failed to reset ratings." });
  }
});

// بدء السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));