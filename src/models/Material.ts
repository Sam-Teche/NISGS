import mongoose, { Schema, Document } from "mongoose";

export type MaterialType = "lecture_note" | "past_question";

export interface IMaterial extends Document {
  type: MaterialType;
  courseCode: string;
  courseTitle: string;
  part: number;
  year?: string;
  //fileUrl: string;
  downloads: number;  
  downloadUrl?: string; // ← ADD THIS
  fileName: string;
  fileSize: number;
  storagePath?: string;
  uploadedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>({
  type: {
    type: String,
    enum: ["lecture_note", "past_question"],
    required: true,
  },
  courseCode: { type: String, required: true, uppercase: true, trim: true },
  courseTitle: { type: String, required: true, trim: true },
  part: { type: Number, required: true, min: 1, max: 5 },
  year: { type: String, trim: true },
  //fileUrl: { type: String, required: true },
  downloads: { type: Number, default: 0 },
  storagePath: { type: String, default: null }, // null = legacy Drive file
  downloadUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

MaterialSchema.index({ courseCode: "text", courseTitle: "text" });

export default mongoose.model<IMaterial>("Material", MaterialSchema);
