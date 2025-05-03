import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskPriority } from '../../../models/task.model';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-task.component.html',
  styleUrl: './create-task.component.scss'
})
export class CreateTaskComponent implements OnChanges {
  @Input() taskToEdit: Task | null = null;
  @Output() taskSaved = new EventEmitter<Partial<Task>>();
  @Output() cancelEdit = new EventEmitter<void>();

  formTask: Partial<Task> = { description: '', estimatedHours: 1 };
  formPriority: number = 1; // Default to Medium
  editingTaskId: string | null = null;
  priorityMap = [TaskPriority.Low, TaskPriority.Mid, TaskPriority.High];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit'] && this.taskToEdit) {
      this.editingTaskId = this.taskToEdit.id;
      // Ensure form starts with at least 1 hour when editing
      const editHours = this.taskToEdit.estimatedHours < 1 ? 1 : this.taskToEdit.estimatedHours;
      this.formTask = { description: this.taskToEdit.description, estimatedHours: editHours };
      this.formPriority = this.priorityMap.indexOf(this.taskToEdit.priority);
    } else if (!this.taskToEdit) {
      this.resetForm(); // Reset if taskToEdit becomes null (e.g., after saving or cancelling)
    }
  }

  addOrUpdateTask() {
    if (!this.formTask.description || this.formPriority === undefined || this.formPriority === null || this.formTask.estimatedHours === undefined) return;

    // Ensure estimated hours is at least 1
    if (this.formTask.estimatedHours < 1) {
      this.formTask.estimatedHours = 1;
    }

    const taskData: Partial<Task> = {
      ...this.formTask,
      priority: this.priorityMap[this.formPriority],
      id: this.editingTaskId ?? undefined // Include id only if editing
    };

    this.taskSaved.emit(taskData);
    // Reset form handled by parent or ngOnChanges when taskToEdit becomes null
  }

  cancel() {
    this.resetForm();
    this.cancelEdit.emit();
  }

  resetForm() {
    this.formTask = { description: '', estimatedHours: 1 };
    this.formPriority = 1;
    this.editingTaskId = null;
  }

  getPriorityGradient() {
    // Simple gradient, adjust colors as needed or use SCSS variables
    return 'linear-gradient(90deg, #43a047 0%, #fbc02d 50%, #e53935 100%)';
  }
}
