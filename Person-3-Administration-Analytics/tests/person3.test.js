import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/swm_p3_test';
process.env.JWT_SECRET = 'test-secret-person-3';
delete process.env.GEMINI_API_KEY;

import app from '../server/app.js';
import { connectDB, resetDBCache } from '../server/shared/config/db.js';
import { User } from '../server/shared/models/User.js';
import { Complaint } from '../server/shared/models/Complaint.js';
import { Escalation } from '../server/shared/models/Escalation.js';
import { Notification } from '../server/shared/models/Notification.js';
import { AuditLog } from '../server/shared/models/AuditLog.js';

describe('Person 3 — Municipal Administration, Priority, Escalation, Analytics & Audit API', () => {
  beforeAll(async () => {
    await connectDB(process.env.MONGODB_URI);
    await Complaint.syncIndexes();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Complaint.deleteMany({}),
      Escalation.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    resetDBCache();
  });

  it('estimates priority with safety rules, supports admin override, prevents duplicate escalations, and builds real aggregations', async () => {
    const hash = await bcrypt.hash('Pass123!', 10);
    await User.create({ name: 'Chief Admin', email: 'chief@city.org', passwordHash: hash, role: 'admin' });
    const citizen = await User.create({ name: 'Citizen One', email: 'c1@city.org', passwordHash: hash, role: 'citizen' });

    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'chief@city.org', password: 'Pass123!' });
    const adminToken = adminLogin.body.data.token;

    const citizenLogin = await request(app).post('/api/auth/login').send({ email: 'c1@city.org', password: 'Pass123!' });
    const citizenToken = citizenLogin.body.data.token;

    // 1. RBAC Denial creates an AuditLog entry
    const denied = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(denied.status).toBe(403);

    // 2. Seed overdue complaint + resolved complaint
    const overdue = await Complaint.create({
      complaintCode: 'SWM-2026-OVR01',
      citizenId: citizen._id,
      title: 'Medical syringe dumping near clinic',
      description: 'Discarded hospital needles and biohazard waste outside gate',
      wasteCategory: 'medical',
      priority: 'medium',
      location: { type: 'Point', coordinates: [77.595, 12.972] },
      address: 'Clinic Lane 2',
      slaDeadline: new Date(Date.now() - 3 * 3600 * 1000)
    });

    await Complaint.create({
      complaintCode: 'SWM-2026-RES01',
      citizenId: citizen._id,
      title: 'Plastic bottles pile',
      description: 'Plastic wrappers collected near bus stop',
      wasteCategory: 'plastic',
      priority: 'low',
      status: 'resolved',
      resolvedAt: new Date(),
      location: { type: 'Point', coordinates: [77.5952, 12.9722] },
      address: 'Bus Stand North'
    });

    // 3. AI Priority Estimation enforces >= HIGH for medical
    const aiRes = await request(app)
      .post('/api/ai/priority')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        complaintId: overdue._id,
        description: 'Discarded hospital needles and biohazard waste outside gate',
        wasteCategory: 'medical',
        coordinates: [77.595, 12.972]
      });
    expect(aiRes.status).toBe(200);
    expect(['high', 'critical']).toContain(aiRes.body.data.suggestedPriority);

    // 4. Admin Override
    const overrideRes = await request(app)
      .patch(`/api/admin/complaints/${overdue._id}/priority`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 'high', overrideReason: 'Verified school proximity' });
    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.aiPriority.overriddenByAdmin).toBe(true);

    // Force overdue SLA deadline again for escalation test
    await Complaint.findByIdAndUpdate(overdue._id, { slaDeadline: new Date(Date.now() - 2 * 3600 * 1000) });

    // 5. Escalation Run #1 escalates; Escalation Run #2 respects cooldown and creates 0 duplicates
    const esc1 = await request(app)
      .post('/api/admin/escalations/run')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(esc1.status).toBe(200);
    expect(esc1.body.data.escalatedCount).toBe(1);

    const esc2 = await request(app)
      .post('/api/admin/escalations/run')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(esc2.status).toBe(200);
    expect(esc2.body.data.escalatedCount).toBe(0);

    // 6. Real Analytics, Hotspots, CSV Export & Audit Logs
    const [summaryRes, hotspotRes, csvRes, auditRes] = await Promise.all([
      request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/analytics/hotspots').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/admin/reports/export?format=csv').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/admin/audit-logs').set('Authorization', `Bearer ${adminToken}`)
    ]);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.totalComplaints).toBe(2);
    expect(summaryRes.body.data.resolvedComplaints).toBe(1);
    expect(hotspotRes.status).toBe(200);
    expect(hotspotRes.body.data.hotspots.length).toBeGreaterThan(0);
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('SWM-2026-OVR01');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.some((l) => l.action === 'RBAC_DENIED')).toBe(true);
  });
});
