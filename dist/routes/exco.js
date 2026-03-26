"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Exco_1 = __importDefault(require("../models/Exco"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
router.get('/', async (_req, res) => {
    try {
        const excos = await Exco_1.default.find().sort({ order: 1, createdAt: 1 });
        res.json(excos);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/', auth_1.adminMiddleware, upload_1.imageUpload.single('photo'), async (req, res) => {
    try {
        const exco = await Exco_1.default.create({
            ...req.body,
            photo: req.file ? `/uploads/images/${req.file.filename}` : null,
            order: Number(req.body.order) || 0
        });
        res.status(201).json(exco);
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
        const exco = await Exco_1.default.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(exco);
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/:id', auth_1.adminMiddleware, async (req, res) => {
    try {
        await Exco_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'EXCO member deleted' });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
module.exports = router;
