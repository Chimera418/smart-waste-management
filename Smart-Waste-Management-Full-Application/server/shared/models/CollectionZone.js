import mongoose from 'mongoose';

const collectionZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    wardNumber: { type: String, default: '' },
    boundary: {
      type: { type: String, enum: ['Polygon'], required: true },
      coordinates: { type: [[[Number]]], required: true }
    },
    center: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true }
    },
    assignedWorkers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],
    assignedVehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
    populationEstimate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'collectionZones' }
);

collectionZoneSchema.index({ boundary: '2dsphere' });

export const CollectionZone =
  mongoose.models.CollectionZone || mongoose.model('CollectionZone', collectionZoneSchema);
