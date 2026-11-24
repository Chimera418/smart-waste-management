import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/swm_full_test';
process.env.JWT_SECRET = 'test-secret-full-app';
delete process.env.GEMINI_API_KEY;

import app from '../server/app.js';
import { connectDB, resetDBCache } from '../server/shared/config/db.js';
import { User } from '../server/shared/models/User.js';
import { CollectionZone } from '../server/shared/models/CollectionZone.js';
import { Worker } from '../server/shared/models/Worker.js';
import { Vehicle } from '../server/shared/models/Vehicle.js';
import { Complaint } from '../server/shared/models/Complaint.js';
import { CollectionTask } from '../server/shared/models/CollectionTask.js';
import { Notification } from '../server/shared/models/Notification.js';
import { Escalation } from '../server/shared/models/Escalation.js';
import { AuditLog } from '../server/shared/models/AuditLog.js';
import { ChatMessage } from '../server/shared/models/ChatMessage.js';

describe('Full Integrated Application — Cross-Module End-to-End Workflow', () => {
  beforeAll(async () => {
    await connectDB(process.env.MONGODB_URI);
    await Promise.all([
      CollectionZone.syncIndexes(),
      Complaint.syncIndexes(),
      Vehicle.syncIndexes(),
      Worker.syncIndexes()
    ]);
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      CollectionZone.deleteMany({}),
      Worker.deleteMany({}),
      Vehicle.deleteMany({}),
      Complaint.deleteMany({}),
      CollectionTask.deleteMany({}),
      Notification.deleteMany({}),
      Escalation.deleteMany({}),
      AuditLog.deleteMany({}),
      ChatMessage.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    resetDBCache();
  });

  it('executes complete lifecycle across Citizen -> AI -> Zone -> Recommender -> Worker -> Operator GPS -> Escalation -> Analytics -> Audit', async () => {
    const hash = await bcrypt.hash('Pass123!', 10);
    await User.create({ name: 'Admin User', email: 'admin@full.org', passwordHash: hash, role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@full.org', password: 'Pass123!' });
    const adminToken = adminLogin.body.data.token;

    // Register Citizen, Worker, Operator
    const citReg = await request(app).post('/api/auth/register').send({
      name: 'Citizen A',
      email: 'cit@full.org',
      password: 'Pass123!',
      role: 'citizen'
    });
    const citToken = citReg.body.data.token;

    const wrkReg = await request(app).post('/api/auth/register').send({
      name: 'Worker B',
      email: 'wrk@full.org',
      password: 'Pass123!',
      role: 'worker'
    });
    const wrkToken = wrkReg.body.data.token;
    const workerId = wrkReg.body.data.workerProfile._id;

    const opReg = await request(app).post('/api/auth/register').send({
      name: 'Operator C',
      email: 'op@full.org',
      password: 'Pass123!',
      role: 'vehicle_operator'
    });
    const opToken = opReg.body.data.token;
    const opId = opReg.body.data.user._id;

    // 1. Admin creates GeoJSON zone & Vehicle
    const zoneRes = await request(app)
      .post('/api/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Central Zone',
        code: 'ZN-CTR',
        centerCoordinates: [77.595, 12.972],
        boundaryCoordinates: [[[77.58, 12.96], [77.61, 12.96], [77.61, 12.99], [77.58, 12.99], [77.58, 12.96]]]
      });
    const zoneId = zoneRes.body.data._id;

    const vehRes = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationNumber: 'KA-01-HZ-500',
        name: 'Hazmat Unit 1',
        type: 'hazmat_van',
        supportedWasteCategories: ['hazardous', 'medical'],
        capacityKg: 2500,
        operatorId: opId,
        assignedZoneId: zoneId,
        coordinates: [77.594, 12.971]
      });
    const vehicleId = vehRes.body.data._id;

    // 2. Citizen categorizes via AI & submits complaint -> auto-links Zone & AI Priority
    const catRes = await request(app)
      .post('/api/ai/categorize')
      .set('Authorization', `Bearer ${citToken}`)
      .send({ title: 'Chemical spill', description: 'Toxic acid battery chemical spill near school' });
    expect(catRes.body.data.suggestedCategory).toBe('hazardous');

    const c1 = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citToken}`)
      .send({
        title: 'Chemical spill near school',
        description: 'Toxic acid battery chemical spill leaking near school gate',
        wasteCategory: 'hazardous',
        estimatedWeightKg: 150,
        address: '10 School Road',
        coordinates: [77.5952, 12.9722]
      });
    expect(c1.status).toBe(201);
    expect(c1.body.data.zoneId).toBe(zoneId);
    expect(['high', 'critical']).toContain(c1.body.data.priority);

    // 3. Second nearby similar complaint is flagged as potential duplicate without rejection
    const c2 = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citToken}`)
      .send({
        title: 'Acid chemical spill outside school',
        description: 'Toxic acid battery chemical leaking near school gate',
        wasteCategory: 'hazardous',
        address: '11 School Road',
        coordinates: [77.5953, 12.9723]
      });
    expect(c2.status).toBe(201);
    expect(c2.body.data.duplicateAnalysis.isPotentialDuplicate).toBe(true);

    // Make c2 overdue for escalation verification
    await Complaint.findByIdAndUpdate(c2.body.data._id, {
      slaDeadline: new Date(Date.now() - 2 * 3600 * 1000),
      priority: 'medium'
    });

    // 4. Citizen Chatbot checks status, files a complaint, and persists history
    const chatRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${citToken}`)
      .send({ message: 'Check status of my complaints' });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.data.actionType).toBe('status_lookup');
    expect(chatRes.body.data.actionData.complaints.length).toBe(2);

    const submitChat = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${citToken}`)
      .send({ message: 'Report overflowing plastic bottles at 88 Residency Road, around 40kg' });
    expect(submitChat.status).toBe(200);
    expect(submitChat.body.data.actionType).toBe('complaint_created');

    const chatHist = await request(app)
      .get('/api/ai/chat/history')
      .set('Authorization', `Bearer ${citToken}`);
    expect(chatHist.status).toBe(200);
    expect(chatHist.body.data.length).toBe(4);
    expect(chatHist.body.data.some((m) => m.actionType === 'complaint_created')).toBe(true);

    // Clean up chat-created test complaint so summary counts stay exact
    await Complaint.deleteOne({ _id: submitChat.body.data.actionData.complaint._id });

    const chatDel = await request(app)
      .delete('/api/ai/chat/history')
      .set('Authorization', `Bearer ${citToken}`);
    expect(chatDel.status).toBe(200);

    // 5. Admin recommends vehicle & dispatches task for c1
    const recRes = await request(app)
      .post('/api/vehicles/recommend')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        coordinates: [77.5952, 12.9722],
        wasteCategory: 'hazardous',
        estimatedWeightKg: 150,
        zoneId
      });
    expect(recRes.body.data.topRecommendation.vehicle._id).toBe(vehicleId);

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        complaintId: c1.body.data._id,
        assignedWorkerId: workerId,
        assignedVehicleId: vehicleId
      });
    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data._id;

    // Admin complaint feed exposes populated worker, vehicle & operator details
    const adminComplaints = await request(app)
      .get('/api/complaints')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminComplaints.status).toBe(200);
    const assignedComplaint = adminComplaints.body.data.find((x) => x._id === c1.body.data._id);
    expect(assignedComplaint.assignedTaskId.assignedWorkerId.userId.name).toBe('Worker B');
    expect(assignedComplaint.assignedTaskId.assignedVehicleId.registrationNumber).toBe('KA-01-HZ-500');

    // 6. Simulate live vehicle movement toward complaint -> verify milestone alerts & citizen live tracking
    for (let i = 0; i < 4; i++) {
      const simRes = await request(app)
        .post('/api/vehicles/simulate-step')
        .set('Authorization', `Bearer ${opToken}`)
        .send({ vehicleId });
      expect(simRes.status).toBe(200);
    }

    const citTrack = await request(app)
      .get(`/api/complaints/${c1.body.data._id}/tracking`)
      .set('Authorization', `Bearer ${citToken}`);
    expect(citTrack.status).toBe(200);
    expect(citTrack.body.data.vehicle.locationHistory.length).toBeGreaterThanOrEqual(4);
    expect(citTrack.body.data.distanceKm).toBe(0);
    expect(citTrack.body.data.milestonesNotified).toContain('arrived');

    // Operator manual GPS + Worker completes task
    const gpsRes = await request(app)
      .patch(`/api/vehicles/${vehicleId}/location`)
      .set('Authorization', `Bearer ${opToken}`)
      .send({ coordinates: [77.5951, 12.9721], speedKmh: 28, heading: 90 });
    expect(gpsRes.status).toBe(200);

    await request(app).patch(`/api/tasks/${taskId}/accept`).set('Authorization', `Bearer ${wrkToken}`);
    await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${wrkToken}`)
      .send({ status: 'completed', collectedWeightKg: 165 });

    const resolvedComplaint = await Complaint.findById(c1.body.data._id);
    expect(resolvedComplaint.status).toBe('resolved');

    // 7. Citizen received milestone (en route / arrived) & completion notifications
    const citNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${citToken}`);
    expect(citNotifs.body.data.items.some((n) => n.type === 'task_updated')).toBe(true);
    expect(citNotifs.body.data.items.some((n) => n.type === 'task_completed')).toBe(true);

    // 8. Escalate overdue c2 once; cooldown blocks duplicate escalation
    const esc1 = await request(app)
      .post('/api/admin/escalations/run')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(esc1.body.data.escalatedCount).toBe(1);

    const esc2 = await request(app)
      .post('/api/admin/escalations/run')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(esc2.body.data.escalatedCount).toBe(0);

    // 9. Analytics, Hotspots, Tracking, Audit Logs & CSV Export reflect real DB state
    const [summary, hotspots, tracking, audit, csv] = await Promise.all([
      request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/analytics/hotspots').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/vehicles/tracking').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/admin/audit-logs').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/admin/reports/export?format=csv').set('Authorization', `Bearer ${adminToken}`)
    ]);

    expect(summary.body.data.totalComplaints).toBe(2);
    expect(summary.body.data.resolvedComplaints).toBe(1);
    expect(hotspots.body.data.hotspots.length).toBeGreaterThan(0);
    expect(tracking.body.data.vehicles.length).toBe(1);
    expect(audit.body.data.length).toBeGreaterThan(0);
    expect(csv.text).toContain(c1.body.data.complaintCode);
  });
});
