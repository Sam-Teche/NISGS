const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ── API CORS — only your frontend & admin can call the API ──
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean),
    credentials: true,
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Uploads CORS — open for files only (PDFs/images need this to load in browser) ──
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade"); // ← ADD THIS LINE
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  },
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Referrer-Policy", "no-referrer-when-downgrade"); // ← ADD THIS LINE
      }
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(filePath)) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      }
    },
  }),
);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/exco", require("./routes/exco"));
app.use("/api/lecturers", require("./routes/lecturers"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/students", require("./routes/students"));

app.get("/api/health", (req, res) =>
  res.json({ status: "NISGS Backend Running" }),
);

const PORT = process.env.PORT || 5000;

// Start server FIRST
app.listen(PORT, () => {
  console.log(`🚀 NISGS Backend running on port ${PORT}`);
});

// Then connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/nisgs")
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
  });
