export const USER_ROLES = ['citizen', 'worker', 'vehicle_operator', 'admin'];
export const WASTE_CATEGORIES = [
  'organic',
  'recyclable',
  'plastic',
  'electronic',
  'hazardous',
  'construction',
  'medical',
  'mixed',
  'other'
];
export const COMPLAINT_STATUSES = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'rejected'
];
export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];
export const WORKER_AVAILABILITY = ['available', 'on_duty', 'on_break', 'off_duty'];
export const WORKER_SHIFTS = ['morning', 'afternoon', 'night'];
export const VEHICLE_TYPES = ['compactor', 'tipper', 'mini_truck', 'hazmat_van', 'e_rickshaw'];
export const VEHICLE_STATUSES = ['available', 'assigned', 'in_transit', 'maintenance', 'inactive'];
export const TASK_STATUSES = [
  'assigned',
  'accepted',
  'rejected',
  'en_route',
  'in_progress',
  'completed',
  'cancelled'
];
export const NOTIFICATION_TYPES = [
  'complaint_submitted',
  'status_updated',
  'task_assigned',
  'task_updated',
  'task_completed',
  'escalation_alert',
  'system_alert'
];
