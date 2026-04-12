import express from "express";
import Exco from "../models/Exco";
import { adminMiddleware } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const excos = await Exco.find().sort({ order: 1, createdAt: 1 });
    res.json(excos);
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
      const exco = await Exco.create({
        ...req.body,
        photo: req.file ? (req.file as any).path : null,
        order: Number(req.body.order) || 0,
      });
      res.status(201).json(exco);
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
      if (req.file) update.photo = (req.file as any).path;
      const exco = await Exco.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });
      res.json(exco);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Exco.findByIdAndDelete(req.params.id);
    res.json({ message: "EXCO member deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
