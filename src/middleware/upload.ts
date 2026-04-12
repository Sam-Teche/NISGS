import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// ── Cloudinary config ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cloudinary storage for images ──
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "nisgs/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  } as any,
});

// ── Local disk storage (for PDFs) ──
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
const storage = (folder: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, "../../uploads", folder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  });

// ── imageUpload now uses Cloudinary ──
export const imageUpload = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()))
      cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ── pdfUpload untouched ──
export const pdfUpload = multer({
  storage: storage("materials"),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf")
      cb(null, true);
    else cb(new Error("Only PDF files allowed"));
  },
});
