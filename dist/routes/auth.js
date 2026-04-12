"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Student_1 = __importDefault(require("../models/Student"));
const router = express_1.default.Router();
// Admin login
router.post("/admin/login", (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid admin password" });
    }
    const token = jsonwebtoken_1.default.sign({ role: "admin", id: "admin" }, process.env.JWT_SECRET || "secret", { expiresIn: "24h" });
    res.json({ token, role: "admin" });
});
// Student login
router.post("/student/login", async (req, res) => {
    try {
        const { matricNumber, surname } = req.body;
        if (!matricNumber || !surname) {
            return res
                .status(400)
                .json({ message: "Matric number and surname required" });
        }
        const student = await Student_1.default.findOne({
            matricNumber: matricNumber.toUpperCase().trim(),
            surname: { $regex: new RegExp(`^${surname.trim()}$`, "i") },
            isActive: true,
        });
        if (!student) {
            return res
                .status(401)
                .json({ message: "Invalid credentials or account not active" });
        }
        const token = jsonwebtoken_1.default.sign({ role: "student", id: student._id, matricNumber: student.matricNumber }, process.env.JWT_SECRET || "secret", { expiresIn: "8h" });
        res.json({
            token,
            role: "student",
            student: {
                id: student._id,
                name: `${student.firstName} ${student.surname}`,
                matricNumber: student.matricNumber,
                part: student.part,
                email: student.email,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
