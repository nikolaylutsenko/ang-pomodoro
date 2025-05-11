import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskStatus } from '../../../models/task.model';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CreateTaskComponent } from '../create-task/create-task.component'; // Import CreateTaskComponent

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, CreateTaskComponent], // Add CreateTaskComponent
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnChanges, OnInit, AfterViewInit {  @Input() tasks: Task[] = [];
  @Input() listType: 'active' | 'pending' | 'completed' = 'active'; // ADDED: listType input with completed
  @Input() cdkDropListId: string = ''; // ADDED
  @Input() cdkDropListConnectedTo: string[] = []; // ADDED

  @Output() deleteTask = new EventEmitter<string>();
  @Output() taskCompleted = new EventEmitter<Task>();
  @Output() taskCreated = new EventEmitter<Partial<Task>>(); // For tasks created via modal
  @Output() taskSelectionChanged = new EventEmitter<{taskId: string, selected: boolean}>(); // New Output
  @Output() moveToActive = new EventEmitter<string>(); // ADDED: Event for moving task to active list
  @Output() moveToBacklog = new EventEmitter<string>(); // ADDED: Event for moving task to backlog list
  @Output() listDropped = new EventEmitter<CdkDragDrop<Task[], Task[]>>(); // ADDED

  filterText: string = '';
  sortDesc: boolean = true;
  sortMode: 'date' | 'manual' | 'priority' = 'priority'; // Added: property to track sort mode, default to priority
  filteredAndSortedTasks: Task[] = [];
  expandedDescriptions: { [taskId: string]: boolean } = {};
  selectedTaskIds: Set<string> = new Set(); // New property to track selections
  showDragHelp: boolean = true; // Property to control drag help tooltip visibility

  showCreateTaskModal: boolean = false;
  taskToEditInModal: Task | null = null;

  constructor() {}
  ngOnInit(): void {
    // Check if the drag help tooltip has been dismissed before
    const dragHelpDismissed = localStorage.getItem('dragHelpDismissed');
    this.showDragHelp = dragHelpDismissed !== 'true';
  }

  ngAfterViewInit(): void { // ADDED ngAfterViewInit stub
    // After view initialization logic can go here if needed in the future
  }

  // Make TaskStatus available in the template
  public get TaskStatus(): typeof TaskStatus {
    return TaskStatus;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.applyFiltersAndSorting();
    }
  }
  applyFiltersAndSorting(): void {
    let filtered = this.tasks.filter(t =>
      t.description.toLowerCase().includes(this.filterText.toLowerCase())
    );
    // Preserve selection: Filter selectedTaskIds to only include tasks currently in the filtered list
    const currentFilteredIds = new Set(filtered.map(t => t.id));
    this.selectedTaskIds = new Set(
      [...this.selectedTaskIds].filter(id => currentFilteredIds.has(id))
    );

    // For completed tasks list, default sort by date completed (newest first)
    if (this.listType === 'completed' && this.sortMode === 'priority') {
      this.sortMode = 'date';
      this.sortDesc = true;
    }    if (this.sortMode === 'date') {
      // Sort by date based on the listType
      this.filteredAndSortedTasks = filtered.sort((a, b) => {
        if (this.listType === 'completed') {
          // For completed tasks tab, sort by completion date
          const dateA = a.dateCompleted?.getTime() || 0;
          const dateB = b.dateCompleted?.getTime() || 0;
          return this.sortDesc ? dateB - dateA : dateA - dateB;
        } else {
          // For other tabs, sort by creation date and completion status
          // Sort by completion status first (completed tasks at the bottom)
          if (a.completionStatus === TaskStatus.Completed && b.completionStatus !== TaskStatus.Completed) {
            return 1;
          }
          if (a.completionStatus !== TaskStatus.Completed && b.completionStatus === TaskStatus.Completed) {
            return -1;
          }
          // Then sort by creation date
          return this.sortDesc ? b.dateCreated.getTime() - a.dateCreated.getTime() : a.dateCreated.getTime() - b.dateCreated.getTime();
        }
      });
    } else if (this.sortMode === 'priority') {
      // Sort by priority if sortMode is 'priority'
      this.filteredAndSortedTasks = filtered.sort((a, b) => {
        // Sort by completion status first (completed tasks at the bottom)
        if (a.completionStatus === TaskStatus.Completed && b.completionStatus !== TaskStatus.Completed) { // Fixed typo here
          return 1;
        }
        if (a.completionStatus !== TaskStatus.Completed && b.completionStatus === TaskStatus.Completed) {
          return -1;
        }
        // Then sort by priority
        return a.priority - b.priority;
      });
    } else { // manual sort mode
      // If sortMode is 'manual', just apply the filter. The order is presumed to be manual.
      // We need to ensure `filtered` maintains the order from `this.tasks` if `this.tasks` itself is correctly ordered manually.
      // Since `this.tasks` is the input from the parent, which should reflect the manual order after a drag, this should be okay.
      this.filteredAndSortedTasks = filtered.map(task => ({...task})); // Create new array to ensure change detection if needed
    }
  }

  toggleSort() { // This is the "Sort by Date" button
    if (this.sortMode === 'date') {
      this.sortDesc = !this.sortDesc;
    } else {
      this.sortMode = 'date';
      this.sortDesc = true; // Default to descending when switching to date sort
    }
    this.applyFiltersAndSorting(); // Re-sort when toggle changes
  }

  switchToPrioritySort() {
    this.sortMode = 'priority';
    this.applyFiltersAndSorting();
  }

  toggleDescription(taskId: string) {
    this.expandedDescriptions[taskId] = !this.expandedDescriptions[taskId];
  }

  editTaskClicked(task: Task): void {
    // this.editTask.emit(task); // Comment out or remove this line
    this.taskToEditInModal = { ...task }; // Set task for modal editing
    this.showCreateTaskModal = true; // Open modal
  }

  deleteTaskClicked(id: string): void {
    this.deleteTask.emit(id);
  }

  completeTaskClicked(task: Task): void {
    this.taskCompleted.emit(task);
  }

  // ADDED: Method to emit event to move task to active
  moveToActiveClicked(taskId: string): void {
    this.moveToActive.emit(taskId);
  }

  // ADDED: Method to emit event to move task to backlog
  moveToBacklogClicked(taskId: string): void {
    this.moveToBacklog.emit(taskId);
  }

  // Methods for the modal
  openCreateTaskModal(): void {
    this.taskToEditInModal = null; // Ensure it's for creation
    this.showCreateTaskModal = true;
  }

  closeCreateTaskModal(): void {
    this.showCreateTaskModal = false;
    this.taskToEditInModal = null;
  }

  handleTaskSavedFromModal(task: Partial<Task>): void {
    this.taskCreated.emit(task); // Emit event for parent component to handle actual save
    this.closeCreateTaskModal();
  }

  // Method to handle individual task selection
  onTaskSelectionChange(taskId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedTaskIds.add(taskId);
    } else {
      this.selectedTaskIds.delete(taskId);
    }
    this.taskSelectionChanged.emit({ taskId, selected: checkbox.checked });
  }

  // Method to toggle select all tasks in the current view
  toggleSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const allVisibleTaskIds = this.filteredAndSortedTasks.map(t => t.id);
    if (checkbox.checked) {
      allVisibleTaskIds.forEach(id => this.selectedTaskIds.add(id));
    } else {
      allVisibleTaskIds.forEach(id => this.selectedTaskIds.delete(id));
    }
    // Emit change for each task affected - or parent component can fetch all selected IDs
    // For simplicity, we can let the parent re-evaluate its selectedActiveTaskIds if needed,
    // or emit individual changes. Emitting individual changes:
    allVisibleTaskIds.forEach(id => {
      this.taskSelectionChanged.emit({ taskId: id, selected: checkbox.checked });
    });
  }

  // Helper to check if all current tasks are selected (for the main checkbox state)
  areAllTasksSelected(): boolean {
    if (this.filteredAndSortedTasks.length === 0) return false;
    return this.filteredAndSortedTasks.every(task => this.selectedTaskIds.has(task.id));
  }

  // Call this when tasks are moved out of this list to clear their selection
  clearSelectionByIds(taskIdsToClear: Set<string>): void {
    let changed = false;
    taskIdsToClear.forEach(id => {
      if (this.selectedTaskIds.has(id)) {
        this.selectedTaskIds.delete(id);
        changed = true;
      }
    });
  }  // Method to handle drag and drop operations
  drop(event: CdkDragDrop<Task[], Task[]>): void {
    // Make sure we have the correct data for the drag event
    event.item.data = event.item.data || this.filteredAndSortedTasks[event.previousIndex];

    // When tasks are reordered, switch to priority sort mode to ensure
    // visual representation matches the actual priority values
    this.sortMode = 'priority';

    // Emit the drop event to the parent component
    this.listDropped.emit(event);
  }

  trackById(index: number, task: Task): string { // ADDED trackById method
    return task.id;
  }

  // Method to dismiss the drag help tooltip and remember the user's preference
  dismissDragHelp(): void {
    this.showDragHelp = false;
    localStorage.setItem('dragHelpDismissed', 'true');
  }
}
