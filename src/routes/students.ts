import express from "express";
import Student from "../models/Student";
import { adminMiddleware } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";

const router = express.Router();

// ── Get all students ──
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

// ── Class stats — MUST be before /:id routes ──
router.get("/class/stats", adminMiddleware, async (_req, res) => {
  try {
    const stats = await Student.aggregate([
      {
        $group: {
          _id: "$part",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(stats);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── UPGRADE specific class — MUST be before /:id routes ──
router.patch("/class/upgrade", adminMiddleware, async (req, res) => {
  try {
    const { fromPart, toPart } = req.body;
    const from = Number(fromPart);
    const to = Number(toPart);
    if (!from || !to || from < 1 || from > 5 || to < 1 || to > 5) {
      return res
        .status(400)
        .json({ message: "fromPart and toPart must be between 1 and 5" });
    }
    if (from === to)
      return res
        .status(400)
        .json({ message: "fromPart and toPart must be different" });
    const result = await Student.updateMany(
      { part: from },
      { $set: { part: to } },
    );
    res.json({
      message: `Moved ${result.modifiedCount} student(s) from Part ${from} to Part ${to}`,
      updated: result.modifiedCount,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── UPGRADE ALL classes — MUST be before /:id routes ──
router.patch("/class/upgrade-all", adminMiddleware, async (req, res) => {
  try {
    const results: string[] = [];
    for (let part = 4; part >= 1; part--) {
      const result = await Student.updateMany(
        { part },
        { $set: { part: part + 1 } },
      );
      if (result.modifiedCount > 0) {
        results.push(
          `Part ${part} → Part ${part + 1}: ${result.modifiedCount} student(s)`,
        );
      }
    }
    res.json({ message: "All classes upgraded", details: results });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE entire class — MUST be before /:id routes ──
router.delete("/class/:part", adminMiddleware, async (req, res) => {
  try {
    const part = Number(req.params.part);
    if (part < 1 || part > 5)
      return res.status(400).json({ message: "Invalid part (1–5)" });
    const result = await Student.deleteMany({ part });
    res.json({
      message: `Deleted ${result.deletedCount} student(s) from Part ${part}`,
      deleted: result.deletedCount,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Bulk add students — MUST be before /:id routes ──
router.post("/bulk", adminMiddleware, async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "No students provided" });
    }

    const results = { added: 0, skipped: 0, errors: [] as string[] };

    for (const s of students) {
      try {
        const matricNumber = String(s.matricNumber || "")
          .toUpperCase()
          .trim();
        const surname = String(s.surname || "").trim();
        const firstName = String(s.firstName || "").trim();
        const email = String(s.email || "")
          .trim()
          .toLowerCase();
        const part = Number(s.part);

        if (!matricNumber || !surname || !firstName || !email || !part) {
          results.errors.push(
            `Skipped row — missing fields: ${matricNumber || "unknown"}`,
          );
          results.skipped++;
          continue;
        }

        const existing = await Student.findOne({ matricNumber });
        if (existing) {
          results.errors.push(`${matricNumber} already exists — skipped`);
          results.skipped++;
          continue;
        }

        await Student.create({ matricNumber, surname, firstName, email, part });
        results.added++;
      } catch (err: any) {
        results.errors.push(`Error: ${err.message}`);
        results.skipped++;
      }
    }

    res.status(201).json({
      message: `${results.added} student(s) added, ${results.skipped} skipped`,
      ...results,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Add single student ──
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

// ── Update student ──
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

// ── Toggle active ──
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

// ── Delete single student ──
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student removed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
