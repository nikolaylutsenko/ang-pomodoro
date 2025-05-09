import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskUrgency, TaskStatus } from '../../models/task.model';
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

  handleTaskOrderChanged(reorderedTasks: Task[]): void {
    // Assuming reorderedTasks contains the tasks in their new order,
    // and these tasks are already part of the main `this.tasks` array but possibly in a different order.
    // The goal is to update `this.tasks` to reflect this new order.

    // Create a map for quick lookup of new order by ID
    const orderMap = new Map(reorderedTasks.map((task, index) => [task.id, index]));

    // Sort the original `this.tasks` array based on the new order from `reorderedTasks`
    this.tasks.sort((a, b) => {
      const orderA = orderMap.get(a.id);
      const orderB = orderMap.get(b.id);

      // Handle cases where a task might not be in reorderedTasks (should not happen if logic is correct)
      if (orderA === undefined) return 1;
      if (orderB === undefined) return -1;

      return orderA - orderB;
    });

    this.saveTasks();
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
          urgency: taskData.urgency!, // Changed priority to urgency
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
        urgency: taskData.urgency!, // Changed priority to urgency
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

  handleTaskCompleted(task: Task): void {
    const taskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (taskIndex > -1) {
      const updatedTask = {
        ...this.tasks[taskIndex],
        completionStatus: TaskStatus.Completed,
        // Optionally, you might want to set completedIntervals to workIntervals
        // if that makes sense for your application logic when a task is manually completed.
        // completedIntervals: this.tasks[taskIndex].workIntervals
      };
      this.tasks = this.tasks.map((t, index) => index === taskIndex ? updatedTask : t);
      this.saveTasks();
    }
  }
}
