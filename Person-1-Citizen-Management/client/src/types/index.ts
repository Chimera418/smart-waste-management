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

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DuplicateCandidate {
  complaintId: string;
  complaintCode: string;
  title?: string;
  status?: string;
  similarityScore: number;
  distanceMeters: number;
  reason: string;
}

export interface Complaint {
  _id: string;
  complaintCode: string;
  title: string;
  description: string;
  wasteCategory: WasteCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedWeightKg: number;
  status: ComplaintStatus;
  address: string;
  landmark?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  aiCategorization?: {
    suggestedCategory: WasteCategory;
    confidence: number;
    issueType: string;
    summary: string;
    keywords: string[];
    userAccepted: boolean;
    modelUsed: string;
    fallbackUsed: boolean;
  };
  duplicateAnalysis?: {
    isPotentialDuplicate: boolean;
    highestSimilarity: number;
    candidates: DuplicateCandidate[];
  };
  statusHistory: { status: ComplaintStatus; note: string; changedAt: string }[];
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
