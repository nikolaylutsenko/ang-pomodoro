import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskUrgency, TaskStatus } from '../../models/task.model';
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { TimerSettingsService, TimerSettings } from '../../services/timer-settings.service';
import { TaskService } from '../../services/task.service';
import { TaskListComponent } from './task-list/task-list.component';
import { CdkDragDrop, moveItemInArray, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-tasks',
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    // CreateTaskComponent, // Removed from imports
    TaskListComponent,
    DragDropModule, // Added DragDropModule here
    MatIconModule, // Add MatIconModule
    MatTabsModule // <-- Add MatTabsModule for Material tabs
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, OnDestroy {
  @ViewChild(TaskListComponent) taskListComponent!: TaskListComponent;
  activeTasks: Task[] = [];
  pendingTasks: Task[] = [];
  completedTasks: Task[] = [];

  // IDs for cdkDropList
  activeTasksListId = 'active-tasks-drop-list';
  pendingTasksListId = 'pending-tasks-drop-list';
  completedTasksListId = 'completed-tasks-drop-list';

  selectedBacklogTaskIds: Set<string> = new Set();
  selectedActiveTaskIds: Set<string> = new Set();
  selectedCompletedTaskIds: Set<string> = new Set();
  activeSubTab: 'taskList' | 'backlog' | 'completed' = 'taskList';

  currentSettings!: TimerSettings;
  private activeTasksSubscription: Subscription = new Subscription();
  private pendingTasksSubscription: Subscription = new Subscription();
  private completedTasksSubscription: Subscription = new Subscription();

  constructor(
    private timerSettings: TimerSettingsService,
    private taskService: TaskService
  ) {}

  ngOnDestroy(): void {
    if (this.activeTasksSubscription) {
      this.activeTasksSubscription.unsubscribe();
    }
    if (this.pendingTasksSubscription) {
      this.pendingTasksSubscription.unsubscribe();
    }
    if (this.completedTasksSubscription) {
      this.completedTasksSubscription.unsubscribe();
    }
  }
  ngOnInit() {
    this.timerSettings.getSettings().subscribe(s => this.currentSettings = s);

    // Subscribe to active tasks
    this.activeTasksSubscription = this.taskService.activeTasks$.subscribe(tasks => {
      this.activeTasks = tasks;
    });

    // Subscribe to pending tasks
    this.pendingTasksSubscription = this.taskService.pendingTasks$.subscribe(tasks => {
      this.pendingTasks = tasks;
    });

    // Subscribe to completed tasks
    this.completedTasksSubscription = this.taskService.completedTasks$.subscribe(tasks => {
      this.completedTasks = tasks;
    });
  }

  // Updated method to change sub-tab
  selectSubTab(tabName: 'taskList' | 'backlog' | 'completed'): void {
    this.activeSubTab = tabName;
    // Potentially clear selections in the non-visible tab if desired, or manage as is.
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
    const finalWorkIntervals = this.calculateWorkIntervals(taskData);
    const estimatedHoursToSave = taskData.estimatedHours!;
    let allTasks = this.taskService.getAllTasks();

    if (taskData.id) { // Editing existing task
      const idx = allTasks.findIndex(t => t.id === taskData.id);
      if (idx > -1) {
        const updatedTask = {
          ...allTasks[idx],
          description: taskData.description!,
          urgency: taskData.urgency!,
          estimatedHours: estimatedHoursToSave,
          workIntervals: finalWorkIntervals,
        };
        allTasks = allTasks.map((task, index) => index === idx ? updatedTask : task);
      }
    } else { // Adding new task
      const currentActiveTasks = this.taskService.getActiveTasksSubject().getValue(); // CORRECTED
      const newPriority =
        currentActiveTasks.length > 0
          ? Math.max(...currentActiveTasks.map((t: Task) => t.priority)) + 1 // TYPED
          : 1;

      const newTask: Task = {
        id: crypto.randomUUID(),
        description: taskData.description!,
        urgency: taskData.urgency!,
        dateCreated: new Date(),
        estimatedHours: estimatedHoursToSave,
        workIntervals: finalWorkIntervals,
        completedIntervals: 0,
        completionStatus: TaskStatus.Created,
        priority: newPriority,
        dateCompleted: null
      };
      allTasks = [...allTasks, newTask];
    }
    this.taskService.saveTasks(allTasks);
    // No need to call updateTaskLists() here, service handles it.
  }

  handleDeleteTask(id: string) {
    let allTasks = this.taskService.getAllTasks();
    allTasks = allTasks.filter(t => t.id !== id);
    this.taskService.saveTasks(allTasks);
    // No need to call updateTaskLists() here, service handles it.
  }

  handleTaskCompleted(task: Task): void {
    let allTasks = this.taskService.getAllTasks();
    const taskIndex = allTasks.findIndex(t => t.id === task.id);
    if (taskIndex > -1) {
      const updatedTask = {
        ...allTasks[taskIndex],
        completionStatus: TaskStatus.Completed,
        dateCompleted: new Date() // Set dateCompleted
      };
      allTasks = allTasks.map((t, index) => index === taskIndex ? updatedTask : t);
      this.taskService.saveTasks(allTasks);
    }
  }

  // Method to handle selection change from backlog list
  onBacklogSelectionChange(event: {taskId: string, selected: boolean}): void { // MODIFIED: Signature changed
    if (event.selected) {
      this.selectedBacklogTaskIds.add(event.taskId);
    } else {
      this.selectedBacklogTaskIds.delete(event.taskId);
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

  // Handle selection change in completed tasks
  onCompletedTaskSelectionChange(event: {taskId: string, selected: boolean}) {
    if (event.selected) {
      this.selectedCompletedTaskIds.add(event.taskId);
    } else {
      this.selectedCompletedTaskIds.delete(event.taskId);
    }
  }

  // Method to handle select all for backlog list
  toggleSelectAllBacklog(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.pendingTasks.forEach(task => this.selectedBacklogTaskIds.add(task.id));
    } else {
      this.selectedBacklogTaskIds.clear();
    }
  }

  moveSelectedTasksToActive(): void {
    if (this.selectedBacklogTaskIds.size === 0) return;

    let maxPriorityInActive = 0; // Start with 0 to ensure the first priority is 1 if list is empty
    this.activeTasks.forEach(task => {
      if (task.priority > maxPriorityInActive) {
        maxPriorityInActive = task.priority;
      }
    });

    let newPriorityCounter = maxPriorityInActive + 1;

    let allTasks = this.taskService.getAllTasks();
    allTasks = allTasks.map(task => {
      if (this.selectedBacklogTaskIds.has(task.id)) {
        return { ...task, completionStatus: TaskStatus.Queued, priority: newPriorityCounter++ }; // Changed from InProgress to Queued
      }
      return task;
    });
    this.selectedBacklogTaskIds.clear();
    this.taskService.saveTasks(allTasks);
  }

  moveSelectedTasksToBacklog(): void {
    if (this.selectedActiveTaskIds.size === 0) return;

    const idsToMove = new Set(this.selectedActiveTaskIds);
    let maxPriorityInBacklog = 0; // Start with 0 to ensure the first priority is 1 if list is empty
    this.pendingTasks.forEach(task => {
      if (task.priority > maxPriorityInBacklog) {
        maxPriorityInBacklog = task.priority;
      }
    });
    let newPriorityCounter = maxPriorityInBacklog + 1;

    let allTasks = this.taskService.getAllTasks();
    allTasks = allTasks.map(task => {
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
    this.taskService.saveTasks(allTasks);
  }
  // Method for handling task drag and drop operations
  drop(event: CdkDragDrop<Task[]>): void {
    const previousListId = event.previousContainer.id;
    const currentListId = event.container.id;
    const movedTaskItem = event.item.data as Task; // Get the task data being dragged

    let allTasks = this.taskService.getAllTasks();

    if (previousListId === currentListId) {
      // Reordering within the same list
      let listToReorder: Task[];
      if (currentListId === this.activeTasksListId) {
        listToReorder = this.activeTasks;
      } else if (currentListId === this.pendingTasksListId) {
        listToReorder = this.pendingTasks;
      } else {
        return;
      }

      // Move the item in the array and update priorities
      moveItemInArray(listToReorder, event.previousIndex, event.currentIndex);
        // Assign new sequential priorities (1-based index)
      listToReorder.forEach((task, index) => {
        const newPriority = index + 1;
        // Store old priority to see if it changed
        const oldPriority = task.priority;
        task.priority = newPriority;

        // Log priority changes for debugging
        if (oldPriority !== newPriority) {
          console.log(`Task "${task.description.substring(0, 20)}..." priority changed: ${oldPriority} → ${newPriority}`);
        }
      });

      // Update priorities in the main task list
      const listMap = new Map(listToReorder.map(t => [t.id, t.priority]));
      allTasks = allTasks.map(task => {
        if (listMap.has(task.id)) {
          return { ...task, priority: listMap.get(task.id)! };
        }
        return task;
      });

    } else {
      // Moving between lists
      let sourceList: Task[];
      let targetList: Task[];
      let newStatusForMovedTask: TaskStatus;

      if (previousListId === this.activeTasksListId && currentListId === this.pendingTasksListId) {
        sourceList = this.activeTasks;
        targetList = this.pendingTasks;
        newStatusForMovedTask = TaskStatus.Pending;
      } else if (previousListId === this.pendingTasksListId && currentListId === this.activeTasksListId) {
        sourceList = this.pendingTasks;
        targetList = this.activeTasks;
        newStatusForMovedTask = TaskStatus.Queued; // Or Created, depending on desired flow
      } else {
        return;
      }

      transferArrayItem(sourceList, targetList, event.previousIndex, event.currentIndex);

      // Update status of the moved task in allTasks array
      const movedTaskIndexInAllTasks = allTasks.findIndex(t => t.id === movedTaskItem.id);
      if (movedTaskIndexInAllTasks > -1) {
        allTasks[movedTaskIndexInAllTasks].completionStatus = newStatusForMovedTask;
      }

      // Re-prioritize both lists
      this.activeTasks.forEach((task, index) => task.priority = index + 1);
      this.pendingTasks.forEach((task, index) => task.priority = index + 1);

      // Update priorities and potentially status in the main task list from both lists
      const activeMap = new Map(this.activeTasks.map(t => [t.id, {priority: t.priority, status: t.completionStatus}]));
      const pendingMap = new Map(this.pendingTasks.map(t => [t.id, {priority: t.priority, status: t.completionStatus}]));

      allTasks = allTasks.map(task => {
        if (task.id === movedTaskItem.id) { // Explicitly update the moved task
          return { ...task, priority: targetList === this.activeTasks ? activeMap.get(task.id)!.priority : pendingMap.get(task.id)!.priority, completionStatus: newStatusForMovedTask };
        } else if (activeMap.has(task.id)) {
          return { ...task, priority: activeMap.get(task.id)!.priority, completionStatus: activeMap.get(task.id)!.status };
        } else if (pendingMap.has(task.id)) {
          return { ...task, priority: pendingMap.get(task.id)!.priority, completionStatus: pendingMap.get(task.id)!.status };
        }
        return task;
      });
    }
    this.taskService.saveTasks(allTasks);
  }

  handleMoveToActive(taskId: string) {
    let allTasks = this.taskService.getAllTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1 && allTasks[taskIndex].completionStatus === TaskStatus.Pending) {
      const currentActiveTasks = this.taskService.getActiveTasksSubject().getValue(); // CORRECTED
      const newPriority =
        currentActiveTasks.length > 0
          ? Math.max(...currentActiveTasks.map((t: Task) => t.priority)) + 1 // TYPED
          : 1;

      allTasks[taskIndex] = {
        ...allTasks[taskIndex],
        completionStatus: TaskStatus.Created, // Or Queued, depending on desired behavior
        priority: newPriority
      };
      this.taskService.saveTasks(allTasks);
    }
  }

  handleMoveToBacklog(taskId: string) {
    let allTasks = this.taskService.getAllTasks();
    const taskIndex = allTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1 && allTasks[taskIndex].completionStatus !== TaskStatus.Pending) {
      const currentPendingTasks = this.pendingTasks; // Use local component's view of pending tasks
      const newPriority =
        currentPendingTasks.length > 0
          ? Math.max(...currentPendingTasks.map((t: Task) => t.priority)) + 1 // TYPED
          : 1;

      allTasks[taskIndex] = {
        ...allTasks[taskIndex],
        completionStatus: TaskStatus.Pending,
        priority: newPriority
      };
      this.taskService.saveTasks(allTasks);
    }
  }

  // Methods for selecting/deselecting tasks for batch actions
  toggleBacklogSelection(taskId: string): void {
    if (this.selectedBacklogTaskIds.has(taskId)) {
      this.selectedBacklogTaskIds.delete(taskId);
    } else {
      this.selectedBacklogTaskIds.add(taskId);
    }
  }

  toggleActiveTaskSelection(taskId: string): void {
    if (this.selectedActiveTaskIds.has(taskId)) {
      this.selectedActiveTaskIds.delete(taskId);
    } else {
      this.selectedActiveTaskIds.add(taskId);
    }
  }

  // Method to open the create task modal in the task list component
  openCreateTask(): void {
    if (this.taskListComponent && this.activeSubTab === 'taskList') {
      this.taskListComponent.openCreateTaskModal();
    }
  }

  // Helper for Material tab index
  getTabIndex(): number {
    switch (this.activeSubTab) {
      case 'taskList': return 0;
      case 'backlog': return 1;
      case 'completed': return 2;
      default: return 0;
    }
  }

  onTabChange(index: number): void {
    switch (index) {
      case 0: this.activeSubTab = 'taskList'; break;
      case 1: this.activeSubTab = 'backlog'; break;
      case 2: this.activeSubTab = 'completed'; break;
    }
  }
}
