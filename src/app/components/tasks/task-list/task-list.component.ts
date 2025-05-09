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

  filterText: string = '';
  sortDesc: boolean = true;
  filteredAndSortedTasks: Task[] = [];
  expandedDescriptions: { [taskId: string]: boolean } = {};

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
  }

  toggleSort() {
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
    moveItemInArray(this.filteredAndSortedTasks, event.previousIndex, event.currentIndex);
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
}
