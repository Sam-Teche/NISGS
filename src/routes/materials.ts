import express, { Request, Response } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase";
import Material from "../models/Material";
import { adminMiddleware, studentMiddleware } from "../middleware/auth";

const router = express.Router();

// ── Multer: memory storage, 50 MB limit ──────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// ── Constants ─────────────────────────────────────────────────────────────────
const BUCKET = "materials";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a clean, organised storage path */
const buildStoragePath = (
  courseCode: string,
  type: string,
  fileName: string,
): string => {
  const safe = fileName.replace(/[^a-zA-Z0-9_\-.]/g, "_");
  return `${type}/${courseCode}/${Date.now()}_${safe}`;
};

/** Get Supabase public URL for a storage path */
const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

/** Map file extension → MIME type */
const getMimeType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] ?? "application/octet-stream";
};

/** Sanitise a string for use in a Content-Disposition filename */
const safeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_\-.]/g, "_");

// ── GET /materials ────────────────────────────────────────────────────────────
router.get("/", studentMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, part, search, courseCode } = req.query;
    const query: Record<string, any> = {};

    if (type) query.type = type;
    if (part) query.part = Number(part);
    if (courseCode)
      query.courseCode = { $regex: String(courseCode), $options: "i" };
    if (search) {
      const s = String(search).trim();
      query.$or = [
        { courseCode: { $regex: s, $options: "i" } },
        { courseTitle: { $regex: s, $options: "i" } },
        { year: { $regex: s, $options: "i" } },
      ];
    }

    const materials = await Material.find(query).sort({ uploadedAt: -1 });
    res.json(materials);
  } catch (err: any) {
    console.error("GET /materials error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /materials — single file upload (admin) ──────────────────────────────
router.post(
  "/",
  adminMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      // ── TEMPORARY DEBUG — remove after fix ──
      console.log("req.body:", req.body);
      console.log("req.file:", req.file);

      const { type, courseCode, courseTitle, part, year } = req.body;

      // ── Validation ──
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded." });
      if (!type || !courseCode || !courseTitle || !part)
        return res.status(400).json({
          message:
            "Missing required fields: type, courseCode, courseTitle, part.",
        });

      const validTypes = ["lecture_note", "past_question"];
      if (!validTypes.includes(type))
        return res.status(400).json({
          message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        });

      if (type === "past_question" && !year)
        return res
          .status(400)
          .json({ message: "Exam year is required for past questions." });

      const code = courseCode.trim().toUpperCase();
      const storagePath = buildStoragePath(code, type, req.file.originalname);
      const mimeType = getMimeType(req.file.originalname);

      // ── Upload to Supabase Storage ──
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res
          .status(500)
          .json({ message: `Storage error: ${uploadError.message}` });
      }

      const fileUrl = getPublicUrl(storagePath);

      const material = await Material.create({
        type,
        courseCode: code,
        courseTitle: courseTitle.trim(),
        part: Number(part),
        year: type === "past_question" ? year?.trim() || undefined : undefined,
        fileUrl,
        downloadUrl: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        storagePath,
        downloads: 0,
      });

      res.status(201).json(material);
    } catch (err: any) {
      console.error("POST /materials error:", err);
      res.status(500).json({ message: err.message });
    }
  },
);

// ── POST /materials/bulk — bulk add via URL list (admin) ──────────────────────
// Accepts an array of materials with pre-existing URLs (Supabase or legacy Drive)
router.post("/bulk", adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { materials } = req.body;
    if (!Array.isArray(materials) || materials.length === 0)
      return res.status(400).json({ message: "No materials provided." });

    const results = { added: 0, skipped: 0, errors: [] as string[] };

    for (const m of materials) {
      try {
        const fileUrl = String(m.fileUrl || "").trim();
        const courseCode = String(m.courseCode || "")
          .trim()
          .toUpperCase();
        const courseTitle = String(m.courseTitle || "").trim();
        const part = Number(m.part);
        const type = String(m.type || "").trim();
        const fileName = String(m.fileName || `${courseCode}.pdf`).trim();

        if (!fileUrl || !courseCode || !courseTitle || !part || !type) {
          results.errors.push(
            `Skipped — missing fields: ${courseCode || "unknown"}`,
          );
          results.skipped++;
          continue;
        }

        await Material.create({
          type,
          courseCode,
          courseTitle,
          part,
          year: m.year || undefined,
          fileUrl,
          downloadUrl: fileUrl,
          fileName,
          fileSize: 0,
          storagePath: null, // no Supabase path — URL-based entry
          downloads: 0,
        });

        results.added++;
      } catch (err: any) {
        results.errors.push(
          `Error for ${m.courseCode || "unknown"}: ${err.message}`,
        );
        results.skipped++;
      }
    }

    res.status(201).json({
      message: `${results.added} material(s) added, ${results.skipped} skipped.`,
      ...results,
    });
  } catch (err: any) {
    console.error("POST /materials/bulk error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /materials/:id/file — view or download a file ────────────────────────
router.get(
  "/:id/file",
  studentMiddleware,
  async (req: Request, res: Response) => {
    try {
      const material = await Material.findById(req.params.id);
      if (!material)
        return res.status(404).json({ message: "Material not found." });

      const isDownload = req.query.download === "true";

      // Track downloads asynchronously (don't block the response)
      if (isDownload) {
        Material.findByIdAndUpdate(req.params.id, {
          $inc: { downloads: 1 },
        }).catch((err) => console.error("Download count update failed:", err));
      }

      // ── Supabase file: redirect to public URL ──
      if (material.storagePath) {
        return res.redirect(302, material.fileUrl);
      }

      // ── Legacy Google Drive file: proxy through server ──
      const https = require("https") as typeof import("https");
      const url = material.fileUrl;
      const fileName = safeFileName(
        `${material.courseCode}_${material.courseTitle}.pdf`,
      );

      const request = https.get(url, (stream) => {
        if (stream.statusCode !== 200) {
          res
            .status(502)
            .json({ message: `Upstream returned ${stream.statusCode}` });
          stream.resume();
          return;
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Content-Disposition",
          isDownload ? `attachment; filename="${fileName}"` : "inline",
        );
        if (stream.headers["content-length"])
          res.setHeader("Content-Length", stream.headers["content-length"]!);

        stream.on("error", (err) => {
          console.error("Drive stream error:", err);
          if (!res.headersSent)
            res.status(500).json({ message: "Stream error." });
        });

        stream.pipe(res);
      });

      request.on("error", (err) => {
        console.error("Drive request error:", err);
        if (!res.headersSent)
          res
            .status(500)
            .json({ message: "Failed to fetch file from storage." });
      });

      request.setTimeout(30_000, () => {
        request.destroy();
        if (!res.headersSent)
          res.status(504).json({ message: "Request timed out." });
      });
    } catch (err: any) {
      console.error("GET /:id/file error:", err);
      res.status(500).json({ message: "Server error." });
    }
  },
);

// ── PATCH /materials/:id — edit metadata ──────────────────────────────────────
router.patch("/:id", adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { courseCode, courseTitle, part, year, type } = req.body;
    const update: Record<string, any> = {};

    if (courseCode !== undefined)
      update.courseCode = courseCode.trim().toUpperCase();
    if (courseTitle !== undefined) update.courseTitle = courseTitle.trim();
    if (part !== undefined) update.part = Number(part);
    if (year !== undefined) update.year = year?.trim() || undefined;
    if (type !== undefined) update.type = type;

    if (Object.keys(update).length === 0)
      return res.status(400).json({ message: "No fields provided to update." });

    const material = await Material.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!material)
      return res.status(404).json({ message: "Material not found." });

    res.json(material);
  } catch (err: any) {
    console.error("PATCH /:id error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /materials/:id ─────────────────────────────────────────────────────
router.delete("/:id", adminMiddleware, async (req: Request, res: Response) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material)
      return res.status(404).json({ message: "Material not found." });

    // Remove file from Supabase Storage (only if uploaded there)
    if (material.storagePath) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([material.storagePath]);
      if (error) console.error("Supabase delete error:", error.message);
      // Still proceed with DB deletion even if storage delete fails
    }

    await material.deleteOne();
    res.json({ message: "Material deleted successfully." });
  } catch (err: any) {
    console.error("DELETE /:id error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
