// Task Urgency Enum
export enum TaskUrgency {
  Low = 'Low',
  Mid = 'Mid',
  High = 'High'
}

// Add TaskStatus Enum
export enum TaskStatus {
  Created = 'Created', // Newly added task
  Pending = 'Pending', // Task in backlog
  Queued = 'Queued',   // Task in daily list, ready to be worked on
  InProgress = 'InProgress',
  Completed = 'Completed'
  // Failed status is removed
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
  dateCompleted: Date | null; // Storing date and time when task was completed
}
