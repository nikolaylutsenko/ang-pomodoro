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

  private calculateWorkIntervals(hours: number): number {
    const totalMinutes = hours * 60;
    const workDuration = this.currentSettings?.workDuration || 25;
    return Math.ceil(totalMinutes / workDuration);
  }

  handleTaskSaved(taskData: Partial<Task>) {
    if (taskData.id) { // Editing existing task
      const idx = this.tasks.findIndex(t => t.id === taskData.id);
      if (idx > -1) {
        const intervals = this.calculateWorkIntervals(taskData.estimatedHours!);
        // Create a new object for the updated task to help with change detection if needed elsewhere
        const updatedTask = {
          ...this.tasks[idx],
          description: taskData.description!,
          priority: taskData.priority!,
          estimatedHours: taskData.estimatedHours!,
          workIntervals: intervals
        };
        // Create a new array with the updated task
        this.tasks = this.tasks.map((task, index) => index === idx ? updatedTask : task);
        this.saveTasks();
      }
      this.editingTask = null;
    } else { // Adding new task
      const intervals = this.calculateWorkIntervals(taskData.estimatedHours!);
      const newTask: Task = {
        id: crypto.randomUUID(),
        description: taskData.description!,
        priority: taskData.priority!,
        dateCreated: new Date(),
        estimatedHours: taskData.estimatedHours!,
        workIntervals: intervals,
        completedIntervals: 0,
        completionStatus: TaskStatus.Pending
      };
      // Create a new array by spreading the existing tasks and adding the new one
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
    if (taskIndex > -1 && this.tasks[taskIndex].completedIntervals < this.tasks[taskIndex].workIntervals) {
        // Create a new object for the updated task
        const updatedTask = {
            ...this.tasks[taskIndex],
            completedIntervals: this.tasks[taskIndex].completedIntervals + 1,
            completionStatus: (this.tasks[taskIndex].completedIntervals + 1) >= this.tasks[taskIndex].workIntervals
                                ? TaskStatus.Completed
                                : TaskStatus.InProgress
        };
        // Create a new array with the updated task
        this.tasks = this.tasks.map((t, index) => index === taskIndex ? updatedTask : t);
        this.saveTasks();
    }
  }
}
