import mongoose from 'mongoose';
import { VEHICLE_STATUSES, VEHICLE_TYPES, WASTE_CATEGORIES } from '../config/constants.js';

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    type: { type: String, enum: VEHICLE_TYPES, required: true },
    supportedWasteCategories: [{ type: String, enum: WASTE_CATEGORIES }],
    capacityKg: { type: Number, required: true },
    currentLoadKg: { type: Number, default: 0 },
    status: { type: String, enum: VEHICLE_STATUSES, default: 'available' },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionZone' },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] }
    },
    totalTripsCompleted: { type: Number, default: 0 },
    totalWasteCollectedKg: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
