// Task Priority Enum
export enum TaskPriority {
  Low = 'Low',
  Mid = 'Mid',
  High = 'High'
}

// Task Entity Interface
export interface Task {
  id: string; // UUID
  description: string; // max 1000 symbols
  dateCreated: Date;
  priority: TaskPriority;
}
