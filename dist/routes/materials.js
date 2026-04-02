"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
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
// ── Proxy route — fetches from Cloudinary and streams to student ──
router.get("/:id/file", auth_1.studentMiddleware, async (req, res) => {
    try {
        const material = await Material_1.default.findById(req.params.id);
        if (!material)
            return res.status(404).json({ message: "Material not found" });
        const isDownload = req.query.download === "true";
        const fileName = `${material.courseCode}_${material.courseTitle}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, "_");
        // Use node-fetch style with built-in https
        const https = require("https");
        const url = material.fileUrl;
        const request = https.get(url, (stream) => {
            if (stream.statusCode !== 200) {
                res
                    .status(502)
                    .json({ message: `Storage returned ${stream.statusCode}` });
                stream.resume(); // drain the response
                return;
            }
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Disposition", isDownload ? `attachment; filename="${fileName}"` : "inline");
            if (stream.headers["content-length"]) {
                res.setHeader("Content-Length", stream.headers["content-length"]);
            }
            stream.on("error", (err) => {
                console.error("Stream error:", err);
                if (!res.headersSent) {
                    res.status(500).json({ message: "Stream error" });
                }
            });
            stream.pipe(res);
        });
        request.on("error", (err) => {
            console.error("Request error:", err);
            if (!res.headersSent) {
                res.status(500).json({ message: "Failed to fetch file" });
            }
        });
        request.setTimeout(30000, () => {
            request.destroy();
            if (!res.headersSent) {
                res.status(504).json({ message: "Request timed out" });
            }
        });
    }
    catch (err) {
        console.error("Proxy route error:", err);
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
