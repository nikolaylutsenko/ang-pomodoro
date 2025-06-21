import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskUrgency } from '../../../models/task.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule
  ],
  templateUrl: './create-task.component.html',
  styleUrl: './create-task.component.scss'
})
export class CreateTaskComponent implements OnChanges {
  @Input() taskToEdit: Task | null = null;
  @Output() taskSaved = new EventEmitter<Partial<Task>>();
  @Output() cancelEdit = new EventEmitter<void>();

  currentDescription: string = '';
  currentUrgencyValue: number = 1; // Index for urgencyMap

  editingTaskId: string | null = null;
  urgencyMap = [TaskUrgency.Low, TaskUrgency.Mid, TaskUrgency.High];
  urgencyColorMap = ['primary','accent','warn'] as const;

  timeOptions: (number | string)[] = [1, 2, 3, 5, 8, 13, 20, 40, 100, '∞', '?'];
  selectedTime: number | string = 1; // Default to 1 hour

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit'] && this.taskToEdit) {
      this.editingTaskId = this.taskToEdit.id;
      const task = this.taskToEdit;
      this.currentDescription = task.description;
      this.currentUrgencyValue = this.urgencyMap.indexOf(task.urgency);

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
    if (!this.currentDescription || this.currentUrgencyValue === undefined || this.currentUrgencyValue === null || this.selectedTime === undefined) return;

    let emittedEstimatedHours: number;
    if (typeof this.selectedTime === 'number') {
      emittedEstimatedHours = this.selectedTime;
    } else {
      emittedEstimatedHours = 0;
    }

    const taskData: Partial<Task> = {
      description: this.currentDescription,
      urgency: this.urgencyMap[this.currentUrgencyValue],
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
    this.currentUrgencyValue = 1;
    this.selectedTime = 1;
    this.editingTaskId = null;
  }

  selectTime(time: number | string): void {
    this.selectedTime = time;
  }

  // ADDED: Method to set urgency from label clicks
  setUrgency(value: number): void {
    this.currentUrgencyValue = value;
  }

  // ADDED: Method to set urgency from slider event
  setUrgencyFromSlider(event: any): void {
    // For MDC-based mat-slider, event.target.value is the number
    const value = typeof event === 'number' ? event : (event?.target?.value ?? 1);
    this.currentUrgencyValue = Number(value);
  }

  getSliderColor(): 'primary' | 'accent' | 'warn' {
    return this.urgencyColorMap[this.currentUrgencyValue];
  }

  getUrgencyGradient() {
    return 'linear-gradient(0deg, #43a047 0%, #fbc02d 50%, #e53935 100%)'; // Changed 90deg to 0deg for vertical
  }
}
