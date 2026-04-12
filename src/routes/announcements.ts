import express from "express";
import Announcement from "../models/Announcement";
import Student from "../models/Student";
import { adminMiddleware, studentMiddleware } from "../middleware/auth";
import { sendAnnouncementEmail } from "../utils/email";

const router = express.Router();

// Public - get published announcements
router.get("/", async (req, res) => {
  try {
    const announcements = await Announcement.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(announcements);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Student - get announcements for their part
router.get("/my", studentMiddleware, async (req: any, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    const announcements = await Announcement.find({
      isPublished: true,
      $or: [{ targetParts: { $size: 0 } }, { targetParts: student.part }],
      excludedStudents: { $nin: [student._id] },
    }).sort({ createdAt: -1 });
    res.json(announcements);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin - get all announcements
router.get("/admin", adminMiddleware, async (_req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin - create announcement
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      content,
      targetParts,
      excludedStudents,
      sendEmail,
      isPublished,
    } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      targetParts: targetParts || [],
      excludedStudents: excludedStudents || [],
      sendEmail: !!sendEmail,
      isPublished: isPublished !== false,
    });

    // Send emails if toggled
    if (sendEmail) {
      const query: any = { isActive: true, emailNotifications: true };
      if (targetParts && targetParts.length > 0)
        query.part = { $in: targetParts };
      if (excludedStudents && excludedStudents.length > 0) {
        query._id = { $nin: excludedStudents };
      }
      const students = await Student.find(query).select(
        "email firstName surname",
      );
      const recipients = students.map((s) => ({
        email: s.email,
        name: `${s.firstName} ${s.surname}`,
      }));
      if (recipients.length > 0) {
        sendAnnouncementEmail(recipients, title, content)
          .then(async () => {
            await Announcement.findByIdAndUpdate(announcement._id, {
              emailSent: true,
            });
          })
          .catch(console.error);
      }
    }
    res.status(201).json(announcement);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Admin - update announcement
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    res.json(announcement);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin - delete
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: "Announcement deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin - get students list for exclusion picker
router.get("/students-for-exclusion", adminMiddleware, async (req, res) => {
  try {
    const { parts } = req.query;
    const query: any = { isActive: true };
    if (parts) query.part = { $in: String(parts).split(",").map(Number) };
    const students = await Student.find(query).select(
      "_id matricNumber surname firstName part",
    );
    res.json(students);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
