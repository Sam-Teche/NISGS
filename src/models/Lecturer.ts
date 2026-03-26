import mongoose, { Schema, Document } from 'mongoose';

export interface ILecturer extends Document {
  name: string;
  title: string;
  photo?: string;
  courses: string[];
  contact: string;
  email?: string;
  order: number;
  createdAt: Date;
}

const LecturerSchema = new Schema<ILecturer>({
  name: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  photo: { type: String, default: null },
  courses: [{ type: String, trim: true }],
  contact: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ILecturer>('Lecturer', LecturerSchema);
