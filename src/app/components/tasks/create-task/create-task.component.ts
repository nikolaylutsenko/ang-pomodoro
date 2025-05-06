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

  currentDescription: string = '';
  currentPriorityValue: number = 1; // Index for priorityMap

  editingTaskId: string | null = null;
  priorityMap = [TaskPriority.Low, TaskPriority.Mid, TaskPriority.High];

  timeOptions: (number | string)[] = [1, 2, 3, 5, 8, 13, 20, 40, 100, '∞', '?'];
  selectedTime: number | string = 1; // Default to 1 hour

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit'] && this.taskToEdit) {
      this.editingTaskId = this.taskToEdit.id;
      const task = this.taskToEdit;
      this.currentDescription = task.description;
      this.currentPriorityValue = this.priorityMap.indexOf(task.priority);

      if (task.workIntervals === '∞' || task.workIntervals === '?') {
        this.selectedTime = task.workIntervals;
      } else {
        this.selectedTime = task.estimatedHours;
      }
      if (!this.timeOptions.includes(this.selectedTime)) {
        this.selectedTime = 1;
      }
    } else if (!this.taskToEdit) {
      this.resetForm();
    }
  }

  addOrUpdateTask() {
    if (!this.currentDescription || this.currentPriorityValue === undefined || this.currentPriorityValue === null || this.selectedTime === undefined) return;

    let emittedEstimatedHours: number;
    if (typeof this.selectedTime === 'number') {
      emittedEstimatedHours = this.selectedTime;
    } else {
      emittedEstimatedHours = 0;
    }

    const taskData: Partial<Task> = {
      description: this.currentDescription,
      priority: this.priorityMap[this.currentPriorityValue],
      id: this.editingTaskId ?? undefined,
      estimatedHours: emittedEstimatedHours,
      workIntervals: this.selectedTime
    };

    this.taskSaved.emit(taskData);
    if (!this.editingTaskId) {
      this.resetForm();
    }
  }

  cancel() {
    this.resetForm();
    this.cancelEdit.emit();
  }

  resetForm() {
    this.currentDescription = '';
    this.currentPriorityValue = 1;
    this.selectedTime = 1;
    this.editingTaskId = null;
  }

  selectTime(time: number | string): void {
    this.selectedTime = time;
  }

  getPriorityGradient() {
    return 'linear-gradient(90deg, #43a047 0%, #fbc02d 50%, #e53935 100%)';
  }
}
