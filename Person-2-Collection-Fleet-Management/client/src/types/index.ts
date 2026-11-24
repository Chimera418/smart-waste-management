export type UserRole = 'citizen' | 'worker' | 'vehicle_operator' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Worker {
  _id: string;
  userId: User;
  employeeCode: string;
  availability: 'available' | 'on_duty' | 'on_break' | 'off_duty';
  shift: 'morning' | 'afternoon' | 'night';
  assignedZoneId?: { _id: string; name: string; code: string };
  activeTaskCount: number;
  completedTasksCount: number;
}

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  name: string;
  type: 'compactor' | 'tipper' | 'mini_truck' | 'hazmat_van' | 'e_rickshaw';
  supportedWasteCategories: string[];
  capacityKg: number;
  currentLoadKg: number;
  status: 'available' | 'assigned' | 'in_transit' | 'maintenance' | 'inactive';
  operatorId?: User;
  assignedZoneId?: { _id: string; name: string; code: string };
  currentLocation: { type: 'Point'; coordinates: [number, number] };
  locationUpdatedAt?: string;
  totalTripsCompleted: number;
  totalWasteCollectedKg: number;
}

export interface CollectionZone {
  _id: string;
  name: string;
  code: string;
  wardNumber?: string;
  description?: string;
  boundary: { type: 'Polygon'; coordinates: [number, number][][] };
  center: { type: 'Point'; coordinates: [number, number] };
  assignedWorkers: Worker[];
  assignedVehicles: Vehicle[];
}

export interface CollectionTask {
  _id: string;
  taskCode: string;
  status: 'assigned' | 'accepted' | 'rejected' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
  instructions?: string;
  collectedWeightKg?: number;
  complaintId: {
    _id: string;
    complaintCode: string;
    title: string;
    wasteCategory: string;
    address: string;
    priority: string;
    estimatedWeightKg?: number;
    location: { type: 'Point'; coordinates: [number, number] };
  };
  assignedWorkerId?: Worker;
  assignedVehicleId?: Vehicle;
  zoneId?: { _id: string; name: string; code: string };
  createdAt: string;
}
