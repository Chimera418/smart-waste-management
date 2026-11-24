import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './shared/config/db.js';
import { createRateLimiter } from './shared/middleware/validate.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/workers.js';
import vehicleRoutes from './routes/vehicles.js';
import taskRoutes from './routes/tasks.js';
import zoneRoutes from './routes/zones.js';
import complaintRoutes from './routes/complaints.js';
import notificationRoutes from './routes/notifications.js';

const app = express();

app.use((req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/api', createRateLimiter());

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Person-2-Collection-Fleet-Management',
      status: 'ok',
      dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
