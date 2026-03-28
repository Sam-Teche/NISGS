import express from "express";
import jwt from "jsonwebtoken";
import Student from "../models/Student";

const router = express.Router();

// Admin login
router.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid admin password" });
  }
  const token = jwt.sign(
    { role: "admin", id: "admin" },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "24h" },
  );
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
    const student = await Student.findOne({
      matricNumber: matricNumber.toUpperCase().trim(),
      surname: { $regex: new RegExp(`^${surname.trim()}$`, "i") },
      isActive: true,
    });
    if (!student) {
      return res
        .status(401)
        .json({ message: "Invalid credentials or account not active" });
    }
    const token = jwt.sign(
      { role: "student", id: student._id, matricNumber: student.matricNumber },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "8h" },
    );
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
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
