import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../shared/config/db.js';
import { User } from '../shared/models/User.js';
import { CollectionZone } from '../shared/models/CollectionZone.js';
import { Worker } from '../shared/models/Worker.js';
import { Vehicle } from '../shared/models/Vehicle.js';
import { Complaint } from '../shared/models/Complaint.js';
import { CollectionTask } from '../shared/models/CollectionTask.js';
import { Notification } from '../shared/models/Notification.js';
import { Escalation } from '../shared/models/Escalation.js';
import { AuditLog } from '../shared/models/AuditLog.js';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/swm_demo';
  await connectDB(uri);
  await Promise.all([
    CollectionZone.syncIndexes(),
    Complaint.syncIndexes(),
    Vehicle.syncIndexes(),
    Worker.syncIndexes()
  ]);

  await Promise.all([
    User.deleteMany({}),
    CollectionZone.deleteMany({}),
    Worker.deleteMany({}),
    Vehicle.deleteMany({}),
    Complaint.deleteMany({}),
    CollectionTask.deleteMany({}),
    Notification.deleteMany({}),
    Escalation.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  const [admin, citizen1, citizen2, citizen3, wUser1, wUser2, wUser3, op1, op2, op3] =
    await User.create([
      { name: 'Meera Iyer (Admin)', email: 'admin@civicclean.org', passwordHash, role: 'admin', phone: '9800000001' },
      { name: 'Aarav Sharma', email: 'citizen@civicclean.org', passwordHash, role: 'citizen', phone: '9800000011', address: '14 MG Road, Central Ward' },
      { name: 'Neha Verma', email: 'neha@civicclean.org', passwordHash, role: 'citizen', phone: '9800000012', address: '88 Lakefront Ave, South Zone' },
      { name: 'Kabir Patel', email: 'kabir@civicclean.org', passwordHash, role: 'citizen', phone: '9800000013', address: '22 Tech Park Rd, East Zone' },
      { name: 'Vikram Singh', email: 'worker@civicclean.org', passwordHash, role: 'worker', phone: '9800000021' },
      { name: 'Ramesh Gowda', email: 'ramesh.worker@civicclean.org', passwordHash, role: 'worker', phone: '9800000022' },
      { name: 'Anita Devi', email: 'anita.worker@civicclean.org', passwordHash, role: 'worker', phone: '9800000023' },
      { name: 'Suresh Kumar', email: 'operator@civicclean.org', passwordHash, role: 'vehicle_operator', phone: '9800000031' },
      { name: 'Deepak Yadav', email: 'deepak.op@civicclean.org', passwordHash, role: 'vehicle_operator', phone: '9800000032' },
      { name: 'Farhan Ali', email: 'farhan.op@civicclean.org', passwordHash, role: 'vehicle_operator', phone: '9800000033' }
    ]);

  const [zoneCentral, zoneSouth, zoneEast] = await CollectionZone.create([
    {
      name: 'Central Business District',
      code: 'ZN-CTR',
      wardNumber: 'Ward 14',
      description: 'Commercial & civic core covering MG Road and Market Square',
      center: { type: 'Point', coordinates: [77.595, 12.972] },
      boundary: {
        type: 'Polygon',
        coordinates: [[[77.582, 12.962], [77.608, 12.962], [77.608, 12.984], [77.582, 12.984], [77.582, 12.962]]]
      },
      populationEstimate: 48000
    },
    {
      name: 'South Residential & Lake Zone',
      code: 'ZN-STH',
      wardNumber: 'Ward 22',
      description: 'Residential layouts and Lakefront green belt',
      center: { type: 'Point', coordinates: [77.595, 12.942] },
      boundary: {
        type: 'Polygon',
        coordinates: [[[77.582, 12.93], [77.608, 12.93], [77.608, 12.958], [77.582, 12.958], [77.582, 12.93]]]
      },
      populationEstimate: 62000
    },
    {
      name: 'East Tech Corridor',
      code: 'ZN-EST',
      wardNumber: 'Ward 31',
      description: 'IT campuses and industrial logistics corridor',
      center: { type: 'Point', coordinates: [77.624, 12.972] },
      boundary: {
        type: 'Polygon',
        coordinates: [[[77.61, 12.96], [77.638, 12.96], [77.638, 12.985], [77.61, 12.985], [77.61, 12.96]]]
      },
      populationEstimate: 54000
    }
  ]);

  const [worker1, worker2, worker3] = await Worker.create([
    { userId: wUser1._id, employeeCode: 'WRK-2026-101', assignedZoneId: zoneCentral._id, availability: 'available', shift: 'morning', completedTasksCount: 18, currentLocation: { type: 'Point', coordinates: [77.594, 12.971] }, phone: wUser1.phone },
    { userId: wUser2._id, employeeCode: 'WRK-2026-102', assignedZoneId: zoneSouth._id, availability: 'on_duty', shift: 'morning', activeTaskCount: 1, completedTasksCount: 24, currentLocation: { type: 'Point', coordinates: [77.596, 12.943] }, phone: wUser2.phone },
    { userId: wUser3._id, employeeCode: 'WRK-2026-103', assignedZoneId: zoneEast._id, availability: 'available', shift: 'afternoon', completedTasksCount: 15, currentLocation: { type: 'Point', coordinates: [77.622, 12.972] }, phone: wUser3.phone }
  ]);

  const [veh1, veh2, veh3, veh4] = await Vehicle.create([
    {
      registrationNumber: 'KA-01-SW-101',
      name: 'Central Heavy Compactor',
      type: 'compactor',
      supportedWasteCategories: ['organic', 'plastic', 'recyclable', 'mixed'],
      capacityKg: 5000,
      currentLoadKg: 1200,
      status: 'available',
      operatorId: op1._id,
      assignedZoneId: zoneCentral._id,
      currentLocation: { type: 'Point', coordinates: [77.5945, 12.9718] },
      totalTripsCompleted: 42,
      totalWasteCollectedKg: 68500
    },
    {
      registrationNumber: 'KA-01-HZ-204',
      name: 'Rapid Hazmat & Bio Van',
      type: 'hazmat_van',
      supportedWasteCategories: ['hazardous', 'medical', 'electronic'],
      capacityKg: 2200,
      currentLoadKg: 200,
      status: 'available',
      operatorId: op2._id,
      assignedZoneId: zoneCentral._id,
      currentLocation: { type: 'Point', coordinates: [77.598, 12.975] },
      totalTripsCompleted: 19,
      totalWasteCollectedKg: 11200
    },
    {
      registrationNumber: 'KA-01-TP-309',
      name: 'East Tipper Truck',
      type: 'tipper',
      supportedWasteCategories: ['construction', 'mixed', 'organic'],
      capacityKg: 4500,
      currentLoadKg: 900,
      status: 'in_transit',
      operatorId: op3._id,
      assignedZoneId: zoneEast._id,
      currentLocation: { type: 'Point', coordinates: [77.624, 12.971] },
      totalTripsCompleted: 31,
      totalWasteCollectedKg: 52000
    },
    {
      registrationNumber: 'KA-01-EV-412',
      name: 'South E-Rickshaw Unit',
      type: 'e_rickshaw',
      supportedWasteCategories: ['organic', 'recyclable', 'plastic'],
      capacityKg: 600,
      currentLoadKg: 100,
      status: 'available',
      operatorId: op1._id,
      assignedZoneId: zoneSouth._id,
      currentLocation: { type: 'Point', coordinates: [77.594, 12.944] },
      totalTripsCompleted: 55,
      totalWasteCollectedKg: 19400
    }
  ]);

  zoneCentral.assignedWorkers = [worker1._id];
  zoneCentral.assignedVehicles = [veh1._id, veh2._id];
  zoneSouth.assignedWorkers = [worker2._id];
  zoneSouth.assignedVehicles = [veh4._id];
  zoneEast.assignedWorkers = [worker3._id];
  zoneEast.assignedVehicles = [veh3._id];
  await Promise.all([zoneCentral.save(), zoneSouth.save(), zoneEast.save()]);

  const now = Date.now();
  const cList = await Complaint.create([
    {
      complaintCode: 'SWM-2026-D001',
      citizenId: citizen1._id,
      title: 'Overflowing organic market bin near City Gate',
      description: 'Decomposing vegetable and food waste spilling onto footpath for 2 days.',
      wasteCategory: 'organic',
      priority: 'high',
      estimatedWeightKg: 180,
      location: { type: 'Point', coordinates: [77.5952, 12.9721] },
      address: 'Market Gate Road, Ward 14',
      zoneId: zoneCentral._id,
      status: 'submitted',
      slaDeadline: new Date(now - 4 * 3600 * 1000),
      statusHistory: [{ status: 'submitted', note: 'Submitted by citizen', changedBy: citizen1._id }]
    },
    {
      complaintCode: 'SWM-2026-D002',
      citizenId: citizen2._id,
      title: 'Leaking paint & battery chemicals near Lake Drain',
      description: 'Discarded industrial paint cans and old batteries leaking near stormwater drain.',
      wasteCategory: 'hazardous',
      priority: 'critical',
      estimatedWeightKg: 120,
      location: { type: 'Point', coordinates: [77.5948, 12.9435] },
      address: 'Lakefront Drain 3, Ward 22',
      zoneId: zoneSouth._id,
      status: 'assigned',
      slaDeadline: new Date(now + 4 * 3600 * 1000),
      statusHistory: [
        { status: 'submitted', note: 'Submitted by citizen', changedBy: citizen2._id },
        { status: 'assigned', note: 'Assigned to Hazmat crew', changedBy: admin._id }
      ]
    },
    {
      complaintCode: 'SWM-2026-D003',
      citizenId: citizen3._id,
      title: 'Construction rubble blocking East Tech service lane',
      description: 'Broken concrete slabs and bricks dumped overnight on service road.',
      wasteCategory: 'construction',
      priority: 'medium',
      estimatedWeightKg: 600,
      location: { type: 'Point', coordinates: [77.6245, 12.9724] },
      address: 'Tech Park Service Lane, Ward 31',
      zoneId: zoneEast._id,
      status: 'resolved',
      resolvedAt: new Date(now - 2 * 3600 * 1000),
      slaDeadline: new Date(now + 12 * 3600 * 1000),
      statusHistory: [
        { status: 'submitted', note: 'Submitted', changedBy: citizen3._id },
        { status: 'resolved', note: 'Cleared by East Tipper Truck', changedBy: wUser3._id }
      ]
    },
    {
      complaintCode: 'SWM-2026-D004',
      citizenId: citizen1._id,
      title: 'Plastic bottles and wrappers piled at Central Bus Bay',
      description: 'Large pile of single-use plastic bottles and food wrappers beside shelter.',
      wasteCategory: 'plastic',
      priority: 'medium',
      estimatedWeightKg: 75,
      location: { type: 'Point', coordinates: [77.5956, 12.9724] },
      address: 'Central Bus Bay 2',
      zoneId: zoneCentral._id,
      status: 'resolved',
      resolvedAt: new Date(now - 6 * 3600 * 1000),
      slaDeadline: new Date(now + 8 * 3600 * 1000),
      statusHistory: [{ status: 'resolved', note: 'Cleared', changedBy: wUser1._id }]
    }
  ]);

  const activeTask = await CollectionTask.create({
    taskCode: 'TSK-2026-D101',
    complaintId: cList[1]._id,
    zoneId: zoneSouth._id,
    assignedWorkerId: worker2._id,
    assignedVehicleId: veh2._id,
    assignedBy: admin._id,
    status: 'assigned',
    priority: 'critical',
    instructions: 'Wear full chemical PPE and contain drain runoff.',
    statusHistory: [{ status: 'assigned', note: 'Seeded active task', updatedBy: admin._id }]
  });
  cList[1].assignedTaskId = activeTask._id;
  await cList[1].save();

  await CollectionTask.create({
    taskCode: 'TSK-2026-D102',
    complaintId: cList[2]._id,
    zoneId: zoneEast._id,
    assignedWorkerId: worker3._id,
    assignedVehicleId: veh3._id,
    assignedBy: admin._id,
    status: 'completed',
    priority: 'medium',
    collectedWeightKg: 620,
    completionNotes: 'Rubble loaded and transported to C&D recycling facility.',
    completedAt: new Date(now - 2 * 3600 * 1000)
  });

  await Notification.create([
    {
      recipientId: citizen1._id,
      recipientRole: 'citizen',
      type: 'complaint_submitted',
      title: 'Complaint SWM-2026-D001 Registered',
      message: 'Your organic waste complaint at Market Gate Road is queued for dispatch.',
      relatedEntityType: 'complaint',
      relatedEntityId: cList[0]._id
    },
    {
      recipientId: admin._id,
      recipientRole: 'admin',
      type: 'system_alert',
      title: 'System Seeded & Ready',
      message: '1 overdue complaint (SWM-2026-D001) is ready for SLA escalation testing.'
    }
  ]);

  await AuditLog.create({
    actorId: admin._id,
    actorEmail: admin.email,
    actorRole: 'admin',
    action: 'DATABASE_SEEDED',
    resourceType: 'system',
    status: 'success',
    metadata: { zones: 3, vehicles: 4, complaints: 4 }
  });

  console.log('Seed completed successfully against', uri);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
