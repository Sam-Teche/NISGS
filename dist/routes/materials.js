"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfUpload = exports.imageUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
// ── Cloudinary config ──
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// ── Cloudinary storage for images ──
const cloudinaryStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: "nisgs/images",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
});
// ── Local disk storage (for PDFs) ──
const ensureDir = (dir) => {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
};
const storage = (folder) => multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path_1.default.join(__dirname, "../../uploads", folder);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path_1.default.extname(file.originalname));
    },
});
// ── imageUpload now uses Cloudinary ──
exports.imageUpload = (0, multer_1.default)({
    storage: cloudinaryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        if (allowed.test(path_1.default.extname(file.originalname).toLowerCase()))
            cb(null, true);
        else
            cb(new Error("Only image files allowed"));
    },
});
// ── pdfUpload untouched ──
exports.pdfUpload = (0, multer_1.default)({
    storage: storage("materials"),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (path_1.default.extname(file.originalname).toLowerCase() === ".pdf")
            cb(null, true);
        else
            cb(new Error("Only PDF files allowed"));
    },
});
