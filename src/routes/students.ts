import express from "express";
import Student from "../models/Student";
import { adminMiddleware } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";

const router = express.Router();

// Get all students (admin) with search
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const { search, part } = req.query;
    const query: any = {};
    if (part) query.part = Number(part);
    if (search) {
      const s = String(search).trim();
      query.$or = [
        { matricNumber: { $regex: s, $options: "i" } },
        { surname: { $regex: s, $options: "i" } },
        { firstName: { $regex: s, $options: "i" } },
      ];
    }
    const students = await Student.find(query).sort({ part: 1, surname: 1 });
    res.json(students);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Add student
router.post(
  "/",
  adminMiddleware,
  imageUpload.single("photo"),
  async (req, res) => {
    try {
      const { matricNumber, surname, firstName, email, part } = req.body;
      const existing = await Student.findOne({
        matricNumber: matricNumber.toUpperCase().trim(),
      });
      if (existing)
        return res
          .status(400)
          .json({ message: "Matric number already registered" });
      const student = await Student.create({
        matricNumber: matricNumber.toUpperCase().trim(),
        surname: surname.trim(),
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        part: Number(part),
        photo: req.file ? `/uploads/images/${req.file.filename}` : null,
      });
      res.status(201).json(student);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  },
);

// Update student
router.put(
  "/:id",
  adminMiddleware,
  imageUpload.single("photo"),
  async (req, res) => {
    try {
      const update: any = { ...req.body };
      if (req.file) update.photo = `/uploads/images/${req.file.filename}`;
      if (update.matricNumber)
        update.matricNumber = update.matricNumber.toUpperCase().trim();
      const student = await Student.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });
      if (!student)
        return res.status(404).json({ message: "Student not found" });
      res.json(student);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Delete student
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student removed from whitelist" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Toggle active
router.patch("/:id/toggle", adminMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    student.isActive = !student.isActive;
    await student.save();
    res.json(student);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
