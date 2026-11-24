import mongoose from 'mongoose';
import { USER_ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'admin', index: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
