import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  targetParts: number[];
  excludedStudents: mongoose.Types.ObjectId[];
  sendEmail: boolean;
  emailSent: boolean;
  isPublished: boolean;
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  targetParts: [{ type: Number, min: 1, max: 5 }],
  excludedStudents: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  sendEmail: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
