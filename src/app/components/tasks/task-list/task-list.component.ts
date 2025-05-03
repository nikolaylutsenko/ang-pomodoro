import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnChanges {
  @Input() tasks: Task[] = [];
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();
  @Output() completeInterval = new EventEmitter<Task>();
  @Output() filterChanged = new EventEmitter<string>(); // Optional: Emit filter changes if parent needs it

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
}
