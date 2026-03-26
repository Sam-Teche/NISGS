import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ Add this CORS config
app.use(
  cors({
    origin: [
      "https://thriving-hotteok-8cba12.netlify.app",
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/exco", require("./routes/exco"));
app.use("/api/lecturers", require("./routes/lecturers"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/students", require("./routes/students"));

app.get("/api/health", (_req, res) =>
  res.json({ status: "NISGS API Running ✅" }),
);

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nisgs";
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = Number(process.env.PORT) || 5000;
    app.listen(PORT, () =>
      console.log(`🚀 NISGS Backend running on port ${PORT}`),
    );
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

export default app;
