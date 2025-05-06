import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../models/task.model';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnChanges {
  @Input() tasks: Task[] = [];
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();
  @Output() completeInterval = new EventEmitter<Task>();
  @Output() filterChanged = new EventEmitter<string>(); // Optional: Emit filter changes if parent needs it
  @Output() taskOrderChanged = new EventEmitter<Task[]>();

  filterText: string = '';
  sortDesc: boolean = true;
  filteredAndSortedTasks: Task[] = [];
  expandedDescriptions: { [taskId: string]: boolean } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.applyFiltersAndSorting();
    }
  }

  applyFiltersAndSorting(): void {
    let filtered = this.tasks.filter(t =>
      t.description.toLowerCase().includes(this.filterText.toLowerCase())
    );
    this.filteredAndSortedTasks = filtered.sort((a, b) =>
      this.sortDesc ? b.dateCreated.getTime() - a.dateCreated.getTime() : a.dateCreated.getTime() - b.dateCreated.getTime()
    );
  }

  toggleSort() {
    this.sortDesc = !this.sortDesc;
    this.applyFiltersAndSorting(); // Re-sort when toggle changes
  }

  toggleDescription(taskId: string) {
    this.expandedDescriptions[taskId] = !this.expandedDescriptions[taskId];
  }

  editTaskClicked(task: Task): void {
    this.editTask.emit(task);
  }

  deleteTaskClicked(id: string): void {
    this.deleteTask.emit(id);
  }

  completeIntervalClicked(task: Task): void {
    this.completeInterval.emit(task);
  }

  drop(event: CdkDragDrop<Task[]>) {
    moveItemInArray(this.filteredAndSortedTasks, event.previousIndex, event.currentIndex);
    // Emit an event to notify the parent component of the order change.
    // The parent component can then decide if/how to persist this new order.
    // We emit a copy of the array to avoid direct modification issues.
    this.taskOrderChanged.emit([...this.filteredAndSortedTasks]);
    // If you want to reflect the order change in the original 'tasks' array immediately,
    // you might need a more complex logic to map sorted/filtered indices back to original indices,
    // or update the main 'tasks' array in the parent component based on the emitted event.
    // For now, this reorders the displayed list.
  }
}
