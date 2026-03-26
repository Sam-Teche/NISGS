"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// ✅ Add this CORS config
app.use((0, cors_1.default)({
    origin: [
        "https://thriving-hotteok-8cba12.netlify.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/exco", require("./routes/exco"));
app.use("/api/lecturers", require("./routes/lecturers"));
app.use("/api/materials", require("./routes/materials"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/students", require("./routes/students"));
app.get("/api/health", (_req, res) => res.json({ status: "NISGS API Running ✅" }));
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nisgs";
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = Number(process.env.PORT) || 5000;
    app.listen(PORT, () => console.log(`🚀 NISGS Backend running on port ${PORT}`));
})
    .catch((err) => console.error("❌ MongoDB connection error:", err));
exports.default = app;
