import mongoose, { Schema, Document } from 'mongoose';

export interface IExco extends Document {
  name: string;
  role: string;
  photo?: string;
  contact: string;
  email?: string;
  order: number;
  createdAt: Date;
}

const ExcoSchema = new Schema<IExco>({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  photo: { type: String, default: null },
  contact: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IExco>('Exco', ExcoSchema);
