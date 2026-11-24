import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/swm_p1_test';
process.env.JWT_SECRET = 'test-secret-person-1';
delete process.env.GEMINI_API_KEY; // Exercise deterministic validated fallback offline

import app from '../server/app.js';
import { connectDB, resetDBCache } from '../server/shared/config/db.js';
import { User } from '../server/shared/models/User.js';
import { Complaint } from '../server/shared/models/Complaint.js';
import { Notification } from '../server/shared/models/Notification.js';
import { ChatMessage } from '../server/shared/models/ChatMessage.js';

describe('Person 1 — Citizen & Complaint Management API', () => {
  beforeAll(async () => {
    await connectDB(process.env.MONGODB_URI);
    await Complaint.syncIndexes();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Complaint.deleteMany({}),
      Notification.deleteMany({}),
      ChatMessage.deleteMany({})
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    resetDBCache();
  });

  it('registers, logs in, verifies JWT, updates profile, and enforces RBAC on /api/users', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Priya Nair',
      email: 'priya@city.org',
      password: 'Password123!',
      phone: '9876543210',
      address: '12 Lakeview Road'
    });
    expect(reg.status).toBe(201);
    expect(reg.body.success).toBe(true);
    expect(reg.body.data.token).toBeTruthy();

    const token = reg.body.data.token;
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('priya@city.org');

    const updated = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '9998887776' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user.phone).toBe('9998887776');

    const rbacDenied = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(rbacDenied.status).toBe(403);
  });

  it('categorizes waste with structured JSON, detects duplicates without rejecting, and logs notifications', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Rohan Mehta',
      email: 'rohan@city.org',
      password: 'Password123!'
    });
    const token = reg.body.data.token;

    // 1. AI Categorize
    const aiRes = await request(app)
      .post('/api/ai/categorize')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Leaking chemical drums',
        description: 'Broken paint and battery chemical drums leaking toxic liquid near storm drain.'
      });
    expect(aiRes.status).toBe(200);
    expect(aiRes.body.data.suggestedCategory).toBe('hazardous');
    expect(aiRes.body.data.confidence).toBeGreaterThan(0.5);

    // 2. Submit First Complaint
    const c1 = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Leaking chemical drums near Ward 5 drain',
        description: 'Broken paint and battery chemical drums leaking toxic liquid near storm drain.',
        wasteCategory: 'hazardous',
        address: 'Ward 5 Storm Drain',
        coordinates: [77.5946, 12.9716]
      });
    expect(c1.status).toBe(201);
    expect(c1.body.data.complaintCode).toMatch(/^SWM-/);

    // 3. Submit Nearby Similar Complaint -> flagged as potential duplicate but NOT rejected
    const c2 = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Toxic chemical paint drums leaking by storm drain',
        description: 'Broken chemical paint drums leaking near Ward 5 storm drain.',
        wasteCategory: 'hazardous',
        address: 'Ward 5 Drain Corner',
        coordinates: [77.5948, 12.9717]
      });
    expect(c2.status).toBe(201);
    expect(c2.body.data.duplicateAnalysis.isPotentialDuplicate).toBe(true);
    expect(c2.body.data.duplicateAnalysis.candidates.length).toBeGreaterThan(0);

    // 4. Chatbot persists history and notifications were created
    const chatRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'How do I dispose of hazardous battery waste?' });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.data.reply.toLowerCase()).toContain('hazardous');

    const chatHist = await request(app)
      .get('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);
    expect(chatHist.status).toBe(200);
    expect(chatHist.body.data.length).toBe(2);

    const chatClear = await request(app)
      .delete('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);
    expect(chatClear.status).toBe(200);

    const chatHistAfter = await request(app)
      .get('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);
    expect(chatHistAfter.body.data.length).toBe(0);

    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.unreadCount).toBe(2);
  });
});
