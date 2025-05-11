import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task, TaskStatus } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$ = this.tasksSubject.asObservable();

  private activeTasksSubject = new BehaviorSubject<Task[]>([]);
  public activeTasks$ = this.activeTasksSubject.asObservable();

  private pendingTasksSubject = new BehaviorSubject<Task[]>([]);
  public pendingTasks$ = this.pendingTasksSubject.asObservable();

  private completedTasksSubject = new BehaviorSubject<Task[]>([]);
  public completedTasks$ = this.completedTasksSubject.asObservable();

  constructor() {
    this.loadTasksFromLocalStorage();
  }

  private loadTasksFromLocalStorage(): void {
    const savedTasks = localStorage.getItem('tasks');
    let loadedTasks: Task[] = [];

    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks).map((t: any, index: number) => ({
        ...t,
        dateCreated: new Date(t.dateCreated),
        dateCompleted: t.dateCompleted ? new Date(t.dateCompleted) : null,
        completionStatus: t.completionStatus || TaskStatus.Pending,
        priority: t.priority !== undefined ? (t.priority === 0 ? 1 : t.priority) : index + 1
      }));

      // Re-prioritize tasks to be sequential and 1-based
      const activeTasksForNormalization = parsedTasks
        .filter((t: Task) =>
          t.completionStatus === TaskStatus.Created ||
          t.completionStatus === TaskStatus.Queued ||
          t.completionStatus === TaskStatus.InProgress
        )
        .sort((a: Task, b: Task) => a.priority - b.priority)
        .map((task: Task, index: number) => ({ ...task, priority: index + 1 }));

      const pendingTasksForNormalization = parsedTasks
        .filter((t: Task) => t.completionStatus === TaskStatus.Pending)
        .sort((a: Task, b: Task) => a.priority - b.priority)
        .map((task: Task, index: number) => ({ ...task, priority: index + 1 }));

      const completedTasks = parsedTasks
        .filter((t: Task) => t.completionStatus === TaskStatus.Completed);

      loadedTasks = [...activeTasksForNormalization, ...pendingTasksForNormalization, ...completedTasks];
      this.tasksSubject.next(loadedTasks);
      this.updateFilteredTaskLists(loadedTasks);
    } else {
      // If no tasks in localStorage, emit empty arrays for all subjects
      this.tasksSubject.next([]);
      this.updateFilteredTaskLists([]); // Ensure filtered lists are also empty
    }
  }

  private updateFilteredTaskLists(tasks: Task[]): void {
    const activeTasks = tasks
      .filter(
        (t: Task) =>
          t.completionStatus === TaskStatus.Created ||
          t.completionStatus === TaskStatus.Queued ||
          t.completionStatus === TaskStatus.InProgress
      )
      .sort((a: Task, b: Task) => a.priority - b.priority);

    const pendingTasks = tasks
      .filter((t: Task) => t.completionStatus === TaskStatus.Pending)
      .sort((a: Task, b: Task) => a.priority - b.priority);    const completedTasks = tasks
      .filter((t: Task) => t.completionStatus === TaskStatus.Completed)
      .sort((a: Task, b: Task) =>
        // Sort completed tasks by completion date (newest first)
        b.dateCompleted && a.dateCompleted
          ? b.dateCompleted.getTime() - a.dateCompleted.getTime()
          : a.priority - b.priority);

    this.activeTasksSubject.next(activeTasks);
    this.pendingTasksSubject.next(pendingTasks);
    this.completedTasksSubject.next(completedTasks);
  }

  public getAllTasks(): Task[] {
    return this.tasksSubject.getValue();
  }

  public saveTasks(tasks: Task[]): void {
    const sortedTasksForStorage = [...tasks].sort((a, b) => a.priority - b.priority);
    localStorage.setItem('tasks', JSON.stringify(sortedTasksForStorage));
    this.tasksSubject.next(tasks); // Emit the current state of tasks
    this.updateFilteredTaskLists(tasks); // Update filtered lists based on the current state
  }

  public setTaskInProgress(taskId: string | null): void {
    const tasks = this.getAllTasks();

    // Set any current InProgress task to Queued
    let updatedTasks = tasks.map(t => {
      if (t.completionStatus === TaskStatus.InProgress) {
        return {...t, completionStatus: TaskStatus.Queued};
      }
      return t;
    });

    // If a task ID is provided, set that task to InProgress
    if (taskId) {
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          completionStatus: TaskStatus.InProgress
        };
      }
    }

    // Save updated tasks
    this.saveTasks(updatedTasks);
  }

  public incrementCompletedIntervals(taskId: string): void {
    const tasks = this.getAllTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex > -1) {
      const task = tasks[taskIndex];
      const updatedCompletedIntervals = (task.completedIntervals || 0) + 1;

      tasks[taskIndex] = {
        ...task,
        completedIntervals: updatedCompletedIntervals
      };

      this.saveTasks(tasks);
    }
  }

  // Add getters for the subjects to allow access to getValue()
  public getActiveTasksSubject(): BehaviorSubject<Task[]> {
    return this.activeTasksSubject;
  }

  public getPendingTasksSubject(): BehaviorSubject<Task[]> {
    return this.pendingTasksSubject;
  }

  public getCompletedTasksSubject(): BehaviorSubject<Task[]> {
    return this.completedTasksSubject;
  }
}
