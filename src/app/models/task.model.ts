// Task Urgency Enum
export enum TaskUrgency {
  Low = 'Low',
  Mid = 'Mid',
  High = 'High'
}

// Add TaskStatus Enum
export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Failed = 'Failed'
}

// Task Entity Interface
export interface Task {
  id: string; // UUID
  description: string; // max 1000 symbols
  dateCreated: Date;
  urgency: TaskUrgency;
  priority: number; // Lower number means higher priority

  // New fields
  estimatedHours: number;
  workIntervals: number | string; // Changed from number
  completedIntervals: number;
  completionStatus: TaskStatus;
}
