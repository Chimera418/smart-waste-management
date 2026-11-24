export type UserRole = 'citizen' | 'worker' | 'vehicle_operator' | 'admin';

export type WasteCategory =
  | 'organic'
  | 'recyclable'
  | 'plastic'
  | 'electronic'
  | 'hazardous'
  | 'construction'
  | 'medical'
  | 'mixed'
  | 'other';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  isActive: boolean;
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
  totalTripsCompleted: number;
  totalWasteCollectedKg: number;
}
