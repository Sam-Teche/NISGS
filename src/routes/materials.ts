import express from "express";
import https from "https";
import Material from "../models/Material";
import { adminMiddleware, studentMiddleware } from "../middleware/auth";

const router = express.Router();

// ── Get materials (student or admin) ──
router.get("/", studentMiddleware, async (req, res) => {
  try {
    const { type, part, search, courseCode } = req.query;
    const query: any = {};
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
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Proxy route — fetches from Cloudinary and streams to student ──
router.get("/:id/file", studentMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material)
      return res.status(404).json({ message: "Material not found" });

    const isDownload = req.query.download === "true";
    const fileName =
      `${material.courseCode}_${material.courseTitle}.pdf`.replace(
        /[^a-zA-Z0-9_\-.]/g,
        "_",
      );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Content-Disposition",
      isDownload ? `attachment; filename="${fileName}"` : "inline",
    );

    https
      .get(material.fileUrl, (stream) => {
        stream.pipe(res);
      })
      .on("error", () => {
        res.status(500).json({ message: "Failed to fetch file from storage" });
      });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Upload material (admin only) — accepts JSON body with Cloudinary URL ──
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const {
      type,
      courseCode,
      courseTitle,
      part,
      year,
      fileUrl,
      fileName,
      fileSize,
      storagePath,
    } = req.body;
    if (!fileUrl)
      return res.status(400).json({ message: "fileUrl is required" });
    if (!fileName)
      return res.status(400).json({ message: "fileName is required" });
    if (!fileSize)
      return res.status(400).json({ message: "fileSize is required" });

    const material = await Material.create({
      type,
      courseCode: courseCode.toUpperCase().trim(),
      courseTitle: courseTitle.trim(),
      part: Number(part),
      year: year || undefined,
      fileUrl,
      fileName,
      fileSize: Number(fileSize),
      storagePath: storagePath || null,
    });
    res.status(201).json(material);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Delete material ──
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: "Material deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
