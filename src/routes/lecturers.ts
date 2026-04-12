import express from "express";
import Lecturer from "../models/Lecturer";
import { adminMiddleware } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const lecturers = await Lecturer.find().sort({ order: 1, name: 1 });
    res.json(lecturers);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/",
  adminMiddleware,
  imageUpload.single("photo"),
  async (req, res) => {
    try {
      const courses =
        typeof req.body.courses === "string"
          ? req.body.courses.split(",").map((c: string) => c.trim())
          : req.body.courses || [];
      const lecturer = await Lecturer.create({
        ...req.body,
        courses,
        photo: req.file ? `/uploads/images/${req.file.filename}` : null,
        order: Number(req.body.order) || 0,
      });
      res.status(201).json(lecturer);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.put(
  "/:id",
  adminMiddleware,
  imageUpload.single("photo"),
  async (req, res) => {
    try {
      const update: any = { ...req.body };
      if (req.file) update.photo = `/uploads/images/${req.file.filename}`;
      if (typeof update.courses === "string") {
        update.courses = update.courses.split(",").map((c: string) => c.trim());
      }
      const lecturer = await Lecturer.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });
      res.json(lecturer);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Lecturer.findByIdAndDelete(req.params.id);
    res.json({ message: "Lecturer deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
