import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  matricNumber: string;
  surname: string;
  firstName: string;
  email: string;
  part: number;
  photo?: string;
  isActive: boolean;
  emailNotifications: boolean;
  excludedAnnouncements: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const StudentSchema = new Schema<IStudent>({
  matricNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  surname: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  part: { type: Number, required: true, min: 1, max: 5 },
  photo: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  excludedAnnouncements: [{ type: Schema.Types.ObjectId, ref: 'Announcement' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IStudent>('Student', StudentSchema);
