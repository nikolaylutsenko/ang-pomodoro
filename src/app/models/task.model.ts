// Task Priority Enum
export enum TaskPriority {
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
  priority: TaskPriority;

  // New fields
  estimatedHours: number;
  workIntervals: number;
  completedIntervals: number;
  completionStatus: TaskStatus;
}
