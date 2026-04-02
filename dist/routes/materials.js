"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const https_1 = __importDefault(require("https"));
const Material_1 = __importDefault(require("../models/Material"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ── Get materials (student or admin) ──
router.get("/", auth_1.studentMiddleware, async (req, res) => {
    try {
        const { type, part, search, courseCode } = req.query;
        const query = {};
        if (type)
            query.type = type;
        if (part)
            query.part = Number(part);
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
        const materials = await Material_1.default.find(query).sort({ uploadedAt: -1 });
        res.json(materials);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// ── Proxy route — fetches from Cloudinary and streams to student ──
router.get("/:id/file", auth_1.studentMiddleware, async (req, res) => {
    try {
        const material = await Material_1.default.findById(req.params.id);
        if (!material)
            return res.status(404).json({ message: "Material not found" });
        const isDownload = req.query.download === "true";
        const fileName = `${material.courseCode}_${material.courseTitle}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, "_");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Disposition", isDownload ? `attachment; filename="${fileName}"` : "inline");
        https_1.default
            .get(material.fileUrl, (stream) => {
            stream.pipe(res);
        })
            .on("error", () => {
            res.status(500).json({ message: "Failed to fetch file from storage" });
        });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// ── Upload material (admin only) — accepts JSON body with Cloudinary URL ──
router.post("/", auth_1.adminMiddleware, async (req, res) => {
    try {
        const { type, courseCode, courseTitle, part, year, fileUrl, fileName, fileSize, storagePath, } = req.body;
        if (!fileUrl)
            return res.status(400).json({ message: "fileUrl is required" });
        if (!fileName)
            return res.status(400).json({ message: "fileName is required" });
        if (!fileSize)
            return res.status(400).json({ message: "fileSize is required" });
        const material = await Material_1.default.create({
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
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// ── Delete material ──
router.delete("/:id", auth_1.adminMiddleware, async (req, res) => {
    try {
        await Material_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Material deleted" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;
