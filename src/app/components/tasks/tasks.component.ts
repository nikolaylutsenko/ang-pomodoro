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
    // reorderedTasks comes from task-list.component and already has updated priorities
    // based on their new order in that list.
    // We need to update these priorities in the main allTasks list.

    const reorderedTaskMap = new Map(reorderedTasks.map(task => [task.id, task.priority]));

    this.allTasks = this.allTasks.map(task => {
      if (reorderedTaskMap.has(task.id)) {
        // Update priority for tasks that were reordered
        return { ...task, priority: reorderedTaskMap.get(task.id)! };
      }
      return task;
    });

    // After updating priorities, re-sort allTasks if necessary, or ensure lists are correctly derived.
    // The task-list component will sort its own view. We just need to ensure allTasks is consistent for saving.
    // If tasksForList is derived from allTasks and then sorted by priority, this should be fine.

    this.saveTasks();
    this.updateTaskLists(); // Refresh both lists, which should respect new priorities if sorted by them.
  }

  private loadTasks(): void {
    const data = localStorage.getItem('tasks');
    let loadedTasks: Task[] = data
      ? JSON.parse(data).map((t: any, index: number) => ({
          ...t,
          dateCreated: new Date(t.dateCreated),
          completionStatus: t.completionStatus || TaskStatus.Pending,
          // Ensure priority is at least 1, if it exists, otherwise assign index + 1
          priority: t.priority !== undefined ? (t.priority === 0 ? 1 : t.priority) : index + 1
        }))
      : [];

    // Re-prioritize all tasks to be sequential and 1-based if loading from older data or for consistency
    // This part can be sophisticated. For now, let's ensure active tasks and backlog tasks have sequential priorities
    // within their groups, starting from 1.

    const activeTasks = loadedTasks
      .filter(t => t.completionStatus !== TaskStatus.Pending)
      .sort((a, b) => a.priority - b.priority)
      .map((task, index) => ({ ...task, priority: index + 1 }));

    const pendingTasks = loadedTasks
      .filter(t => t.completionStatus === TaskStatus.Pending)
      .sort((a, b) => a.priority - b.priority)
      .map((task, index) => ({ ...task, priority: index + 1 }));

    this.allTasks = [...activeTasks, ...pendingTasks];
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
          // priority is NOT changed here; it's managed by drag/drop or creation
        };
        this.allTasks = this.allTasks.map((task, index) => index === idx ? updatedTask : task);
      }
    } else { // Adding new task
      // New tasks are added to InProgress, their priority should be at the end of the current active tasks + 1
      const newPriority =
        this.tasksForList.length > 0
          ? Math.max(...this.tasksForList.map(t => t.priority)) + 1
          : 1; // Start with 1 if no active tasks

      const newTask: Task = {
        id: crypto.randomUUID(),
        description: taskData.description!,
        urgency: taskData.urgency!,
        dateCreated: new Date(),
        estimatedHours: estimatedHoursToSave,
        workIntervals: finalWorkIntervals,
        completedIntervals: 0,
        completionStatus: TaskStatus.InProgress, // Changed from TaskStatus.Pending
        priority: newPriority
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

    let maxPriorityInActive = 0; // Start with 0 to ensure the first priority is 1 if list is empty
    this.tasksForList.forEach(task => {
      if (task.priority > maxPriorityInActive) {
        maxPriorityInActive = task.priority;
      }
    });

    let newPriorityCounter = maxPriorityInActive + 1;

    this.allTasks = this.allTasks.map(task => {
      if (this.selectedBacklogTaskIds.has(task.id)) {
        return { ...task, completionStatus: TaskStatus.InProgress, priority: newPriorityCounter++ };
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
    let maxPriorityInBacklog = 0; // Start with 0 to ensure the first priority is 1 if list is empty
    this.backlogTasks.forEach(task => {
      if (task.priority > maxPriorityInBacklog) {
        maxPriorityInBacklog = task.priority;
      }
    });
    let newPriorityCounter = maxPriorityInBacklog + 1;

    this.allTasks = this.allTasks.map(task => {
      if (idsToMove.has(task.id)) {
        // Assign a new priority suitable for backlog, e.g., at the end of current backlog
        return { ...task, completionStatus: TaskStatus.Pending, priority: newPriorityCounter++ };
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

    // Update priorities for the reordered backlog tasks, starting from 1
    this.backlogTasks.forEach((task, index) => {
      task.priority = index + 1;
    });

    // Update allTasks with the new priorities from backlogTasks
    const backlogTaskMap = new Map(this.backlogTasks.map(task => [task.id, task.priority]));

    this.allTasks = this.allTasks.map(task => {
      if (task.completionStatus === TaskStatus.Pending && backlogTaskMap.has(task.id)) {
        return { ...task, priority: backlogTaskMap.get(task.id)! };
      }
      return task;
    });

    this.saveTasks();
    this.updateTaskLists(); // This will re-filter and re-sort based on allTasks
  }
}
