import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

// ✅ ES Module replacements for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ dotenv using import instead of require
dotenv.config();

const app = express();

// ── API CORS ──
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

// ── Uploads CORS ──
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
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
        res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
      }
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(filePath)) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      }
    },
  }),
);

// ✅ Routes using import instead of require
import authRoutes from "./routes/auth.js";
import excoRoutes from "./routes/exco.js";
import lecturersRoutes from "./routes/lecturers.js";
import materialsRoutes from "./routes/materials.js";
import announcementsRoutes from "./routes/announcements.js";
import studentsRoutes from "./routes/students.js";

app.use("/api/auth", authRoutes);
app.use("/api/exco", excoRoutes);
app.use("/api/lecturers", lecturersRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/students", studentsRoutes);

app.get("/api/health", (req, res) =>
  res.json({ status: "NISGS Backend Running" }),
);

app.get("/api/debug", (req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL,
    ADMIN_URL: process.env.ADMIN_URL,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 NISGS Backend running on port ${PORT}`);
});

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/nisgs")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));
