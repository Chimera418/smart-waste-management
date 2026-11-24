import mongoose from 'mongoose';
import { VEHICLE_STATUSES, VEHICLE_TYPES, WASTE_CATEGORIES } from '../config/constants.js';

const vehicleSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: VEHICLE_TYPES, required: true },
    supportedWasteCategories: [{ type: String, enum: WASTE_CATEGORIES }],
    capacityKg: { type: Number, required: true, min: 50 },
    currentLoadKg: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: VEHICLE_STATUSES, default: 'available', index: true },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionZone', index: true },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] }
    },
    locationUpdatedAt: { type: Date, default: Date.now },
    locationHistory: [
      {
        coordinates: { type: [Number], required: true },
        speedKmh: { type: Number, default: 0 },
        heading: { type: Number, default: 0 },
        recordedAt: { type: Date, default: Date.now }
      }
    ],
    totalTripsCompleted: { type: Number, default: 0 },
    totalWasteCollectedKg: { type: Number, default: 0 }
  },
  { timestamps: true }
);

vehicleSchema.index({ currentLocation: '2dsphere' });

export const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
