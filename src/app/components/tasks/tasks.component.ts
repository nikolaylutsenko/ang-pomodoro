import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskPriority, TaskStatus } from '../../models/task.model';
import { Component, OnInit } from '@angular/core';
import { TimerSettingsService, TimerSettings } from '../../services/timer-settings.service';
import { CreateTaskComponent } from './create-task/create-task.component';
import { TaskListComponent } from './task-list/task-list.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CreateTaskComponent,
    TaskListComponent
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  editingTask: Task | null = null;

  currentSettings!: TimerSettings;

  constructor(private timerSettings: TimerSettingsService) {}

  ngOnInit() {
    this.loadTasks();
    this.timerSettings.getSettings().subscribe(s => this.currentSettings = s);
  }

  private loadTasks(): void {
    const data = localStorage.getItem('tasks');
    this.tasks = data
      ? JSON.parse(data).map((t: any) => ({ ...t, dateCreated: new Date(t.dateCreated) }))
      : [];
  }

  private saveTasks(): void {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
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
      const idx = this.tasks.findIndex(t => t.id === taskData.id);
      if (idx > -1) {
        const updatedTask = {
          ...this.tasks[idx],
          description: taskData.description!,
          priority: taskData.priority!,
          estimatedHours: estimatedHoursToSave, // This is the numeric hour value from button or 0
          workIntervals: finalWorkIntervals // This is the calculated intervals or '∞', '?'
        };
        this.tasks = this.tasks.map((task, index) => index === idx ? updatedTask : task);
        this.saveTasks();
      }
      this.editingTask = null;
    } else { // Adding new task
      const newTask: Task = {
        id: crypto.randomUUID(),
        description: taskData.description!,
        priority: taskData.priority!,
        dateCreated: new Date(),
        estimatedHours: estimatedHoursToSave, // Numeric hours or 0
        workIntervals: finalWorkIntervals, // Calculated intervals or '∞', '?'
        completedIntervals: 0,
        completionStatus: TaskStatus.Pending
      };
      this.tasks = [...this.tasks, newTask];
      this.saveTasks();
    }
  }

  handleCancelEdit() {
    this.editingTask = null;
  }

  handleEditTask(task: Task) {
    // Pass a copy to avoid potential direct mutation issues if CreateTaskComponent modifies the object
    this.editingTask = { ...task };
  }

  handleDeleteTask(id: string) {
    // filter already returns a new array reference
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    if (this.editingTask?.id === id) {
      this.editingTask = null;
    }
  }

  handleCompleteInterval(task: Task): void {
    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (taskIndex > -1) {
      let newCompletionStatus = this.tasks[taskIndex].completionStatus;
      const currentWorkIntervals = this.tasks[taskIndex].workIntervals;
      const currentCompletedIntervals = this.tasks[taskIndex].completedIntervals;

      // Only increment if not '∞' or '?' or if it's a number and not yet completed
      if (typeof currentWorkIntervals === 'number' && currentCompletedIntervals < currentWorkIntervals) {
        const updatedCompletedIntervals = currentCompletedIntervals + 1;
        newCompletionStatus = updatedCompletedIntervals >= currentWorkIntervals ? TaskStatus.Completed : TaskStatus.InProgress;

        const updatedTask = {
          ...this.tasks[taskIndex],
          completedIntervals: updatedCompletedIntervals,
          completionStatus: newCompletionStatus
        };
        this.tasks = this.tasks.map((t, index) => index === taskIndex ? updatedTask : t);
        this.saveTasks();
      } else if (typeof currentWorkIntervals === 'string' && (currentWorkIntervals === '∞' || currentWorkIntervals === '?')) {
        // For '∞' or '?', increment completedIntervals, but status remains InProgress unless changed manually
        const updatedCompletedIntervals = currentCompletedIntervals + 1;
        newCompletionStatus = TaskStatus.InProgress; // Or keep existing if it could be manually set to Completed

        const updatedTask = {
          ...this.tasks[taskIndex],
          completedIntervals: updatedCompletedIntervals,
          completionStatus: newCompletionStatus // Explicitly InProgress or allow manual completion
        };
        this.tasks = this.tasks.map((t, index) => index === taskIndex ? updatedTask : t);
        this.saveTasks();
      }
      // If workIntervals is a number and completedIntervals is already >= workIntervals, do nothing.
    }
  }
}
