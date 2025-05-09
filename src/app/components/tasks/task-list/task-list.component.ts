import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskStatus } from '../../../models/task.model';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { CreateTaskComponent } from '../create-task/create-task.component'; // Import CreateTaskComponent

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, CreateTaskComponent], // Add CreateTaskComponent
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnChanges {
  @Input() tasks: Task[] = [];
  // @Output() editTask = new EventEmitter<Task>(); // Comment out or remove this line
  @Output() deleteTask = new EventEmitter<string>();
  @Output() taskCompleted = new EventEmitter<Task>();
  @Output() filterChanged = new EventEmitter<string>();
  @Output() taskOrderChanged = new EventEmitter<Task[]>();
  @Output() taskCreated = new EventEmitter<Partial<Task>>(); // For tasks created via modal
  @Output() taskSelectionChanged = new EventEmitter<{taskId: string, selected: boolean}>(); // New Output

  filterText: string = '';
  sortDesc: boolean = true;
  sortMode: 'date' | 'manual' = 'date'; // Added: property to track sort mode, default to date
  filteredAndSortedTasks: Task[] = [];
  expandedDescriptions: { [taskId: string]: boolean } = {};
  selectedTaskIds: Set<string> = new Set(); // New property to track selections

  showCreateTaskModal: boolean = false;
  taskToEditInModal: Task | null = null;

  constructor() {}

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

    if (this.sortMode === 'date') {
      // Only sort by date if sortMode is 'date'
      this.filteredAndSortedTasks = filtered.sort((a, b) => {
        // Sort by completion status first (completed tasks at the bottom)
        if (a.completionStatus === TaskStatus.Completed && b.completionStatus !== TaskStatus.Completed) {
          return 1;
        }
        if (a.completionStatus !== TaskStatus.Completed && b.completionStatus === TaskStatus.Completed) {
          return -1;
        }
        // Then sort by date
        return this.sortDesc ? b.dateCreated.getTime() - a.dateCreated.getTime() : a.dateCreated.getTime() - b.dateCreated.getTime();
      });
    } else {
      // If sortMode is 'manual', just apply the filter. The order is presumed to be manual.
      // We need to ensure `filtered` maintains the order from `this.tasks` if `this.tasks` itself is correctly ordered manually.
      // Since `this.tasks` is the input from the parent, which should reflect the manual order after a drag, this should be okay.
      this.filteredAndSortedTasks = filtered.map(task => ({...task})); // Create new array to ensure change detection if needed
    }
  }

  toggleSort() { // This is the "Sort by Date" button
    this.sortMode = 'date'; // Set sort mode to date when this button is clicked
    this.sortDesc = !this.sortDesc;
    this.applyFiltersAndSorting(); // Re-sort when toggle changes
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

  drop(event: CdkDragDrop<Task[]>) {
    // Create a new array for filteredAndSortedTasks to ensure immutability if other parts rely on it
    const newOrderedTasks = [...this.filteredAndSortedTasks];
    moveItemInArray(newOrderedTasks, event.previousIndex, event.currentIndex);
    this.filteredAndSortedTasks = newOrderedTasks; // Update the local list immediately

    this.sortMode = 'manual'; // Set sort mode to manual after drag-drop
    this.taskOrderChanged.emit([...this.filteredAndSortedTasks]);
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
    // if (changed) { // Optionally, inform parent about cleared selections if necessary
    //   // This might be complex if parent needs to know which ones were cleared from this component
    // }
  }
}
