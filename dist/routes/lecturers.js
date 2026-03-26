"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Lecturer_1 = __importDefault(require("../models/Lecturer"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
router.get('/', async (_req, res) => {
    try {
        const lecturers = await Lecturer_1.default.find().sort({ order: 1, name: 1 });
        res.json(lecturers);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/', auth_1.adminMiddleware, upload_1.imageUpload.single('photo'), async (req, res) => {
    try {
        const courses = typeof req.body.courses === 'string'
            ? req.body.courses.split(',').map((c) => c.trim())
            : req.body.courses || [];
        const lecturer = await Lecturer_1.default.create({
            ...req.body,
            courses,
            photo: req.file ? `/uploads/images/${req.file.filename}` : null,
            order: Number(req.body.order) || 0
        });
        res.status(201).json(lecturer);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.put('/:id', auth_1.adminMiddleware, upload_1.imageUpload.single('photo'), async (req, res) => {
    try {
        const update = { ...req.body };
        if (req.file)
            update.photo = `/uploads/images/${req.file.filename}`;
        if (typeof update.courses === 'string') {
            update.courses = update.courses.split(',').map((c) => c.trim());
        }
        const lecturer = await Lecturer_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(lecturer);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/:id', auth_1.adminMiddleware, async (req, res) => {
    try {
        await Lecturer_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lecturer deleted' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports = router;
