import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/swm_p2_test';
process.env.JWT_SECRET = 'test-secret-person-2';

import app from '../server/app.js';
import { connectDB, resetDBCache } from '../server/shared/config/db.js';
import { User } from '../server/shared/models/User.js';
import { Worker } from '../server/shared/models/Worker.js';
import { Vehicle } from '../server/shared/models/Vehicle.js';
import { CollectionZone } from '../server/shared/models/CollectionZone.js';
import { Complaint } from '../server/shared/models/Complaint.js';
import { CollectionTask } from '../server/shared/models/CollectionTask.js';
import { Notification } from '../server/shared/models/Notification.js';

describe('Person 2 — Collection & Fleet Management API', () => {
  beforeAll(async () => {
    await connectDB(process.env.MONGODB_URI);
    await Promise.all([
      CollectionZone.syncIndexes(),
      Complaint.syncIndexes(),
      Vehicle.syncIndexes()
    ]);
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Worker.deleteMany({}),
      Vehicle.deleteMany({}),
      CollectionZone.deleteMany({}),
      Complaint.deleteMany({}),
      CollectionTask.deleteMany({}),
      Notification.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    resetDBCache();
  });

  it('creates GeoJSON zone, recommends deterministic vehicle, dispatches task, updates GPS, and completes collection', async () => {
    const hash = await bcrypt.hash('Pass123!', 10);
    const admin = await User.create({ name: 'Ops Admin', email: 'ops@city.org', passwordHash: hash, role: 'admin' });
    const citizen = await User.create({ name: 'Citizen', email: 'cit@city.org', passwordHash: hash, role: 'citizen' });

    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'ops@city.org', password: 'Pass123!' });
    const adminToken = adminLogin.body.data.token;

    // Register Worker & Operator
    const workerReg = await request(app).post('/api/auth/register').send({
      name: 'Vikram Worker',
      email: 'vikram@city.org',
      password: 'Pass123!',
      role: 'worker'
    });
    const workerToken = workerReg.body.data.token;
    const workerId = workerReg.body.data.workerProfile._id;

    const opReg = await request(app).post('/api/auth/register').send({
      name: 'Suresh Operator',
      email: 'suresh@city.org',
      password: 'Pass123!',
      role: 'vehicle_operator'
    });
    const opToken = opReg.body.data.token;
    const opUserId = opReg.body.data.user._id;

    // 1. Create GeoJSON Zone
    const zoneRes = await request(app)
      .post('/api/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Central Ward',
        code: 'ZN-CTR',
        centerCoordinates: [77.595, 12.972],
        boundaryCoordinates: [
          [
            [77.58, 12.96],
            [77.61, 12.96],
            [77.61, 12.99],
            [77.58, 12.99],
            [77.58, 12.96]
          ]
        ]
      });
    expect(zoneRes.status).toBe(201);
    const zoneId = zoneRes.body.data._id;

    // 2. Register two vehicles (one ineligible small e-rickshaw, one eligible hazmat van)
    await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationNumber: 'KA-01-ER-01',
        name: 'Light Cart',
        type: 'e_rickshaw',
        supportedWasteCategories: ['organic'],
        capacityKg: 100,
        coordinates: [77.594, 12.971]
      });

    const hazmatRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationNumber: 'KA-01-HZ-09',
        name: 'Hazmat Responder',
        type: 'hazmat_van',
        supportedWasteCategories: ['hazardous', 'medical'],
        capacityKg: 2500,
        operatorId: opUserId,
        assignedZoneId: zoneId,
        coordinates: [77.595, 12.972]
      });
    expect(hazmatRes.status).toBe(201);
    const hazmatId = hazmatRes.body.data._id;

    // 3. Seed a hazardous complaint inside the zone
    const complaint = await Complaint.create({
      complaintCode: 'SWM-2026-HAZ01',
      citizenId: citizen._id,
      title: 'Chemical barrel leak',
      description: 'Toxic chemical drums leaking near Central Ward',
      wasteCategory: 'hazardous',
      priority: 'high',
      estimatedWeightKg: 200,
      location: { type: 'Point', coordinates: [77.5955, 12.9725] },
      address: 'Central Market Road',
      zoneId
    });

    // Verify $geoWithin complaints lookup on zone
    const zoneComplaints = await request(app)
      .get(`/api/zones/${zoneId}/complaints`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(zoneComplaints.status).toBe(200);
    expect(zoneComplaints.body.data.length).toBe(1);

    // 4. Deterministic Vehicle Recommendation
    const recRes = await request(app)
      .post('/api/vehicles/recommend')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        coordinates: [77.5955, 12.9725],
        wasteCategory: 'hazardous',
        estimatedWeightKg: 200,
        zoneId
      });
    expect(recRes.status).toBe(200);
    expect(recRes.body.data.topRecommendation.vehicle._id).toBe(hazmatId);

    // 5. Assign Task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        complaintId: complaint._id,
        assignedWorkerId: workerId,
        assignedVehicleId: hazmatId
      });
    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data._id;

    // 6. Worker accepts & completes task; Operator updates GPS
    const acceptRes = await request(app)
      .patch(`/api/tasks/${taskId}/accept`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(acceptRes.status).toBe(200);

    const gpsRes = await request(app)
      .patch(`/api/vehicles/${hazmatId}/location`)
      .set('Authorization', `Bearer ${opToken}`)
      .send({ coordinates: [77.5954, 12.9724], speedKmh: 32, heading: 45 });
    expect(gpsRes.status).toBe(200);
    expect(gpsRes.body.data.locationHistory.length).toBe(2);

    const completeRes = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'completed', collectedWeightKg: 210, note: 'Safely neutralized and cleared' });
    expect(completeRes.status).toBe(200);

    const updatedComplaint = await Complaint.findById(complaint._id);
    expect(updatedComplaint.status).toBe('resolved');
  });
});
