import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskUrgency, TaskStatus } from '../../models/task.model';
import { Component, OnInit, ViewChild } from '@angular/core'; // Added ViewChild
import { TimerSettingsService, TimerSettings } from '../../services/timer-settings.service';
import { TaskListComponent } from './task-list/task-list.component';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop'; // Added DragDropModule

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // CreateTaskComponent, // Removed from imports
    TaskListComponent,
    DragDropModule // Added DragDropModule here
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  @ViewChild(TaskListComponent) taskListComponent!: TaskListComponent;
  allTasks: Task[] = []; // Renamed from tasks
  backlogTasks: Task[] = [];
  tasksForList: Task[] = [];

  selectedBacklogTaskIds: Set<string> = new Set();
  selectedActiveTaskIds: Set<string> = new Set();

  activeSubTab: 'taskList' | 'backlog' = 'taskList'; // New property for active sub-tab

  currentSettings!: TimerSettings;

  constructor(private timerSettings: TimerSettingsService) {}

  ngOnInit() {
    this.loadTasks();
    this.timerSettings.getSettings().subscribe(s => this.currentSettings = s);
  }

  private updateTaskLists(): void {
    this.backlogTasks = this.allTasks.filter(task => task.completionStatus === TaskStatus.Pending);
    // Ensure tasksForList maintains the order from allTasks for non-pending items
    this.tasksForList = this.allTasks.filter(task => task.completionStatus !== TaskStatus.Pending);
    // Clear selections when lists are updated to avoid stale selections
    // It might be better to preserve selection if items are still present in their respective lists
    // For now, let's clear them for simplicity after a move operation.
    // When lists update, if the current active tab has no items and the other does, switch.
    // Or simply ensure selections are appropriate for the visible tab.
  }

  // New method to change sub-tab
  selectSubTab(tabName: 'taskList' | 'backlog'): void {
    this.activeSubTab = tabName;
    // Potentially clear selections in the non-visible tab if desired, or manage as is.
  }

  handleTaskOrderChanged(reorderedTasks: Task[]): void {
    // This event now comes from task-list, which only knows about tasksForList
    // We need to merge this order back into allTasks

    const activeTaskOrderMap = new Map(reorderedTasks.map((task, index) => [task.id, index]));

    // Create a new allTasks array reflecting the new order of active tasks
    // and keeping pending tasks at their relative positions (e.g., at the start or end, or filtered out if not managed by this reorder)
    // For simplicity, let's assume pending tasks are not part of this reordering
    // and active tasks are reordered amongst themselves.

    const pendingTasks = this.allTasks.filter(t => t.completionStatus === TaskStatus.Pending);
    const activeTasks = this.allTasks.filter(t => t.completionStatus !== TaskStatus.Pending);

    activeTasks.sort((a, b) => {
      const orderA = activeTaskOrderMap.get(a.id);
      const orderB = activeTaskOrderMap.get(b.id);
      if (orderA === undefined && orderB === undefined) return 0; // Should not happen if reorderedTasks are from activeTasks
      if (orderA === undefined) return 1;
      if (orderB === undefined) return -1;
      return orderA - orderB;
    });

    this.allTasks = [...pendingTasks, ...activeTasks]; // Or maintain original relative order if needed

    this.saveTasks();
    this.updateTaskLists(); // Refresh both lists
  }

  private loadTasks(): void {
    const data = localStorage.getItem('tasks');
    this.allTasks = data
      ? JSON.parse(data).map((t: any) => ({ ...t, dateCreated: new Date(t.dateCreated), completionStatus: t.completionStatus || TaskStatus.Pending })) // Ensure completionStatus exists
      : [];
    this.updateTaskLists();
  }

  private saveTasks(): void {
    localStorage.setItem('tasks', JSON.stringify(this.allTasks));
  }

  private calculateWorkIntervals(taskData: Partial<Task>): number | string {
    const selectedTime = taskData.workIntervals; // This now holds the button value (hours or symbol)

    if (selectedTime === '∞' || selectedTime === '?') {
      return selectedTime; // Return symbol directly
    }

    if (typeof selectedTime === 'number') {
      if (selectedTime === 0) return 0; // If 0 hours was somehow selected, 0 intervals.
      const totalMinutes = selectedTime * 60;
      const workDuration = this.currentSettings?.workDuration || 25; // Default to 25 if not set
      if (workDuration === 0) return '∞'; // Avoid division by zero, treat as infinite intervals
      return Math.ceil(totalMinutes / workDuration);
    }

    // Fallback for unexpected types, though selectedTime should be number or string from buttons
    return 1;
  }

  handleTaskSaved(taskData: Partial<Task>) {
    // taskData.workIntervals now holds the raw button value (e.g., 5, '∞', '?')
    // taskData.estimatedHours holds the numeric hours (or 0 for symbols)
    const finalWorkIntervals = this.calculateWorkIntervals(taskData);
    const estimatedHoursToSave = taskData.estimatedHours!;

    if (taskData.id) { // Editing existing task
      const idx = this.allTasks.findIndex(t => t.id === taskData.id);
      if (idx > -1) {
        const updatedTask = {
          ...this.allTasks[idx],
          description: taskData.description!,
          urgency: taskData.urgency!,
          estimatedHours: estimatedHoursToSave,
          workIntervals: finalWorkIntervals,
          // completionStatus is not changed here, it's changed by other actions like complete or move to active
        };
        this.allTasks = this.allTasks.map((task, index) => index === idx ? updatedTask : task);
      }
    } else { // Adding new task
      const newTask: Task = {
        id: crypto.randomUUID(),
        description: taskData.description!,
        urgency: taskData.urgency!,
        dateCreated: new Date(),
        estimatedHours: estimatedHoursToSave,
        workIntervals: finalWorkIntervals,
        completedIntervals: 0,
        completionStatus: TaskStatus.InProgress // Changed from TaskStatus.Pending
      };
      this.allTasks = [...this.allTasks, newTask];
    }
    this.saveTasks();
    this.updateTaskLists();
  }

  handleDeleteTask(id: string) {
    this.allTasks = this.allTasks.filter(t => t.id !== id);
    this.saveTasks();
    this.updateTaskLists();
  }

  handleTaskCompleted(task: Task): void {
    const taskIndex = this.allTasks.findIndex(t => t.id === task.id);
    if (taskIndex > -1) {
      const updatedTask = {
        ...this.allTasks[taskIndex],
        completionStatus: TaskStatus.Completed,
      };
      this.allTasks = this.allTasks.map((t, index) => index === taskIndex ? updatedTask : t);
      this.saveTasks();
      this.updateTaskLists();
    }
  }

  // Method to handle selection change from backlog list
  onBacklogSelectionChange(taskId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedBacklogTaskIds.add(taskId);
    } else {
      this.selectedBacklogTaskIds.delete(taskId);
    }
  }

  // Method to handle selection change from active tasks list (task-list.component)
  onActiveTaskSelectionChange(event: {taskId: string, selected: boolean}): void {
    if (event.selected) {
      this.selectedActiveTaskIds.add(event.taskId);
    } else {
      this.selectedActiveTaskIds.delete(event.taskId);
    }
  }

  // Method to handle select all for backlog list
  toggleSelectAllBacklog(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.backlogTasks.forEach(task => this.selectedBacklogTaskIds.add(task.id));
    } else {
      this.selectedBacklogTaskIds.clear();
    }
  }

  moveSelectedTasksToActive(): void {
    if (this.selectedBacklogTaskIds.size === 0) return;

    this.allTasks = this.allTasks.map(task => {
      if (this.selectedBacklogTaskIds.has(task.id)) {
        return { ...task, completionStatus: TaskStatus.InProgress };
      }
      return task;
    });
    this.selectedBacklogTaskIds.clear();
    this.saveTasks();
    this.updateTaskLists();
  }

  moveSelectedTasksToBacklog(): void {
    if (this.selectedActiveTaskIds.size === 0) return;

    const idsToMove = new Set(this.selectedActiveTaskIds);

    this.allTasks = this.allTasks.map(task => {
      if (idsToMove.has(task.id)) {
        return { ...task, completionStatus: TaskStatus.Pending };
      }
      return task;
    });

    // Clear selection in the child component for the moved tasks
    if (this.taskListComponent) {
      this.taskListComponent.clearSelectionByIds(idsToMove);
    }
    this.selectedActiveTaskIds.clear();
    this.saveTasks();
    this.updateTaskLists();
  }

  // Remove or comment out the old moveToActive method as it's replaced
  /*
  moveToActive(taskId: string): void {
    const taskIndex = this.allTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1 && this.allTasks[taskIndex].completionStatus === TaskStatus.Pending) {
      const updatedTask = {
        ...this.allTasks[taskIndex],
        completionStatus: TaskStatus.InProgress // Or your default active status
      };
      this.allTasks = this.allTasks.map((t, index) => index === taskIndex ? updatedTask : t);
      this.saveTasks();
      this.updateTaskLists();
    }
  }
  */

  dropBacklog(event: CdkDragDrop<Task[]>): void {
    // Reorder the backlogTasks array locally
    moveItemInArray(this.backlogTasks, event.previousIndex, event.currentIndex);

    // Update the allTasks array to reflect the new order of backlog items
    // This assumes backlogTasks are contiguous in allTasks or their relative order needs to be preserved among themselves
    const backlogTaskIdsOrder = this.backlogTasks.map(t => t.id);
    const nonBacklogTasks = this.allTasks.filter(t => t.completionStatus !== TaskStatus.Pending);

    // Create a new allTasks array with backlog tasks in their new order, followed by non-backlog tasks
    // Or, if backlog tasks are interspersed, a more complex merge would be needed.
    // For simplicity, we'll sort allTasks by putting newly ordered backlog tasks first, then others.
    // This might change the overall order of allTasks if backlog items were not already grouped.

    const reorderedAllTasks = [
      ...this.backlogTasks, // These are already in the new order
      ...nonBacklogTasks
    ];

    // A more robust way if backlog tasks can be anywhere in allTasks:
    // Create a map of the new order for backlog tasks
    const backlogOrderMap = new Map(this.backlogTasks.map((task, index) => [task.id, index]));

    this.allTasks.sort((a, b) => {
      const isABacklog = a.completionStatus === TaskStatus.Pending;
      const isBBacklog = b.completionStatus === TaskStatus.Pending;

      if (isABacklog && isBBacklog) {
        return (backlogOrderMap.get(a.id) ?? 0) - (backlogOrderMap.get(b.id) ?? 0);
      }
      if (isABacklog) return -1; // Backlog items come before non-backlog items
      if (isBBacklog) return 1;  // Non-backlog items come after backlog items
      return 0; // Preserve original order for non-backlog items relative to each other
    });

    this.saveTasks();
    // No need to call updateTaskLists() if allTasks is directly manipulated and backlogTasks is already updated.
    // However, if allTasks structure is complexly changed, updateTaskLists() ensures consistency.
    this.updateTaskLists();
  }
}
