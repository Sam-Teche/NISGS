"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Student_1 = __importDefault(require("../models/Student"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// Get all students (admin) with search
router.get('/', auth_1.adminMiddleware, async (req, res) => {
    try {
        const { search, part } = req.query;
        const query = {};
        if (part)
            query.part = Number(part);
        if (search) {
            const s = String(search).trim();
            query.$or = [
                { matricNumber: { $regex: s, $options: 'i' } },
                { surname: { $regex: s, $options: 'i' } },
                { firstName: { $regex: s, $options: 'i' } }
            ];
        }
        const students = await Student_1.default.find(query).sort({ part: 1, surname: 1 });
        res.json(students);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// Add student
router.post('/', auth_1.adminMiddleware, upload_1.imageUpload.single('photo'), async (req, res) => {
    try {
        const { matricNumber, surname, firstName, email, part } = req.body;
        const existing = await Student_1.default.findOne({ matricNumber: matricNumber.toUpperCase().trim() });
        if (existing)
            return res.status(400).json({ message: 'Matric number already registered' });
        const student = await Student_1.default.create({
            matricNumber: matricNumber.toUpperCase().trim(),
            surname: surname.trim(),
            firstName: firstName.trim(),
            email: email.trim().toLowerCase(),
            part: Number(part),
            photo: req.file ? `/uploads/images/${req.file.filename}` : null
        });
        res.status(201).json(student);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
});
// Update student
router.put('/:id', auth_1.adminMiddleware, upload_1.imageUpload.single('photo'), async (req, res) => {
    try {
        const update = { ...req.body };
        if (req.file)
            update.photo = `/uploads/images/${req.file.filename}`;
        if (update.matricNumber)
            update.matricNumber = update.matricNumber.toUpperCase().trim();
        const student = await Student_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// Delete student
router.delete('/:id', auth_1.adminMiddleware, async (req, res) => {
    try {
        await Student_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Student removed from whitelist' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// Toggle active
router.patch('/:id/toggle', auth_1.adminMiddleware, async (req, res) => {
    try {
        const student = await Student_1.default.findById(req.params.id);
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        student.isActive = !student.isActive;
        await student.save();
        res.json(student);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports = router;
