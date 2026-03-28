"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const Material_1 = __importDefault(require("../models/Material"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// Get materials (student or admin)
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
// View PDF in browser (authenticated)
router.get("/:id/view", auth_1.studentMiddleware, async (req, res) => {
    try {
        const material = await Material_1.default.findById(req.params.id);
        if (!material)
            return res.status(404).json({ message: "Material not found" });
        const filename = path_1.default.basename(material.fileUrl);
        const filePath = path_1.default.join(__dirname, "../../uploads/materials", filename);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.sendFile(filePath, (err) => {
            if (err)
                res.status(404).json({ message: "File not found on server" });
        });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Download PDF (authenticated, forces download)
router.get("/:id/download", auth_1.studentMiddleware, async (req, res) => {
    try {
        const material = await Material_1.default.findById(req.params.id);
        if (!material)
            return res.status(404).json({ message: "Material not found" });
        const filename = path_1.default.basename(material.fileUrl);
        const filePath = path_1.default.join(__dirname, "../../uploads/materials", filename);
        const downloadName = `${material.courseCode}_${material.courseTitle}${material.year ? "_" + material.year : ""}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, "_");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.download(filePath, downloadName, (err) => {
            if (err)
                res.status(404).json({ message: "File not found on server" });
        });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Upload material (admin only)
router.post("/", auth_1.adminMiddleware, upload_1.pdfUpload.single("file"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "PDF file required" });
        const material = await Material_1.default.create({
            type: req.body.type,
            courseCode: req.body.courseCode.toUpperCase().trim(),
            courseTitle: req.body.courseTitle.trim(),
            part: Number(req.body.part),
            year: req.body.year || undefined,
            fileUrl: `/uploads/materials/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
        });
        res.status(201).json(material);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Delete material
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
