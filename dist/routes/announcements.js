"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Announcement_1 = __importDefault(require("../models/Announcement"));
const Student_1 = __importDefault(require("../models/Student"));
const auth_1 = require("../middleware/auth");
const email_1 = require("../utils/email");
const router = express_1.default.Router();
// Public - get published announcements
router.get("/", async (req, res) => {
    try {
        const announcements = await Announcement_1.default.find({ isPublished: true })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(announcements);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Student - get announcements for their part
router.get("/my", auth_1.studentMiddleware, async (req, res) => {
    try {
        const student = await Student_1.default.findById(req.user.id);
        if (!student)
            return res.status(404).json({ message: "Student not found" });
        const announcements = await Announcement_1.default.find({
            isPublished: true,
            $or: [{ targetParts: { $size: 0 } }, { targetParts: student.part }],
            excludedStudents: { $nin: [student._id] },
        }).sort({ createdAt: -1 });
        res.json(announcements);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Admin - get all announcements
router.get("/admin", auth_1.adminMiddleware, async (_req, res) => {
    try {
        const announcements = await Announcement_1.default.find().sort({ createdAt: -1 });
        res.json(announcements);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Admin - create announcement
router.post("/", auth_1.adminMiddleware, async (req, res) => {
    try {
        const { title, content, targetParts, excludedStudents, sendEmail, isPublished, } = req.body;
        const announcement = await Announcement_1.default.create({
            title,
            content,
            targetParts: targetParts || [],
            excludedStudents: excludedStudents || [],
            sendEmail: !!sendEmail,
            isPublished: isPublished !== false,
        });
        // Send emails if toggled
        if (sendEmail) {
            const query = { isActive: true, emailNotifications: true };
            if (targetParts && targetParts.length > 0)
                query.part = { $in: targetParts };
            if (excludedStudents && excludedStudents.length > 0) {
                query._id = { $nin: excludedStudents };
            }
            const students = await Student_1.default.find(query).select("email firstName surname");
            const recipients = students.map((s) => ({
                email: s.email,
                name: `${s.firstName} ${s.surname}`,
            }));
            if (recipients.length > 0) {
                (0, email_1.sendAnnouncementEmail)(recipients, title, content)
                    .then(async () => {
                    await Announcement_1.default.findByIdAndUpdate(announcement._id, {
                        emailSent: true,
                    });
                })
                    .catch(console.error);
            }
        }
        res.status(201).json(announcement);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Admin - update announcement
router.put("/:id", auth_1.adminMiddleware, async (req, res) => {
    try {
        const announcement = await Announcement_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(announcement);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Admin - delete
router.delete("/:id", auth_1.adminMiddleware, async (req, res) => {
    try {
        await Announcement_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Announcement deleted" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
// Admin - get students list for exclusion picker
router.get("/students-for-exclusion", auth_1.adminMiddleware, async (req, res) => {
    try {
        const { parts } = req.query;
        const query = { isActive: true };
        if (parts)
            query.part = { $in: String(parts).split(",").map(Number) };
        const students = await Student_1.default.find(query).select("_id matricNumber surname firstName part");
        res.json(students);
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;
