import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskPriority, TaskStatus } from '../../models/task.model';
import { Component } from '@angular/core';
import { TimerSettingsService, TimerSettings } from '../../services/timer-settings.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent {
  tasks: Task[] = [];
  filterText: string = '';
  sortDesc: boolean = true;
  priorities = Object.values(TaskPriority);
  priorityMap = [TaskPriority.Low, TaskPriority.Mid, TaskPriority.High];
  expandedDescriptions: { [taskId: string]: boolean } = {};

  // Form state
  formTask: Partial<Task> = { description: '', estimatedHours: 0 };
  formPriority: number = 1;
  editingTaskId: string | null = null;
  
  // Timer settings for calculating intervals
  currentSettings!: TimerSettings;

  constructor(private timerSettings: TimerSettingsService) {}

  ngOnInit() {
    this.loadTasks();
    this.timerSettings.getSettings().subscribe(s => this.currentSettings = s);
  }

  // Restore load and save tasks
  private loadTasks(): void {
    const data = localStorage.getItem('tasks');
    this.tasks = data
      ? JSON.parse(data).map((t: any) => ({ ...t, dateCreated: new Date(t.dateCreated) }))
      : [];
  }

  private saveTasks(): void {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }

  // Compute number of work intervals based on estimated hours and workDuration
  private calculateWorkIntervals(hours: number): number {
    const totalMinutes = hours * 60;
    return Math.ceil(totalMinutes / this.currentSettings.workDuration);
  }

  addOrUpdateTask() {
    if (!this.formTask.description || this.formPriority === undefined || this.formPriority === null || this.formTask.estimatedHours === undefined) return;
    const priority = this.priorityMap[this.formPriority];
    const intervals = this.calculateWorkIntervals(this.formTask.estimatedHours);
    if (this.editingTaskId) {
      // Edit
      const idx = this.tasks.findIndex(t => t.id === this.editingTaskId);
      if (idx > -1) {
        this.tasks[idx].description = this.formTask.description!;
        this.tasks[idx].priority = priority;
        // Update intervals on edit
        this.tasks[idx].estimatedHours = this.formTask.estimatedHours!;
        this.tasks[idx].workIntervals = intervals;
        this.saveTasks();
      }
      this.editingTaskId = null;
    } else {
      // Add
      const newTask: Task = {
        id: crypto.randomUUID(),
        description: this.formTask.description!,
        priority,
        dateCreated: new Date(),
        estimatedHours: this.formTask.estimatedHours!,
        workIntervals: intervals,
        completedIntervals: 0,
        completionStatus: TaskStatus.Pending
      };
      this.tasks.push(newTask);
      this.saveTasks();
    }
    this.formTask = { description: '', estimatedHours: 0 };
    this.formPriority = 1;
  }

  editTask(task: Task) {
    this.formTask = { description: task.description, estimatedHours: task.estimatedHours };
    this.formPriority = this.priorityMap.indexOf(task.priority);
    this.editingTaskId = task.id;
  }

  deleteTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    if (this.editingTaskId === id) {
      this.editingTaskId = null;
      this.formTask = { description: '', estimatedHours: 0 };
      this.formPriority = 1;
    }
  }

  get filteredAndSortedTasks() {
    let filtered = this.tasks.filter(t => t.description.toLowerCase().includes(this.filterText.toLowerCase()));
    return filtered.sort((a, b) => this.sortDesc ? b.dateCreated.getTime() - a.dateCreated.getTime() : a.dateCreated.getTime() - b.dateCreated.getTime());
  }

  toggleSort() {
    this.sortDesc = !this.sortDesc;
  }

  getPriorityGradient() {
    return 'linear-gradient(90deg, #43a047 0%, #fbc02d 50%, #e53935 100%)';
  }

  toggleDescription(taskId: string) {
    this.expandedDescriptions[taskId] = !this.expandedDescriptions[taskId];
  }

  // Mark a work interval as completed and update task status
  completeInterval(task: Task): void {
    if (task.completedIntervals < task.workIntervals) {
      task.completedIntervals++;
      task.completionStatus =
        task.completedIntervals >= task.workIntervals
          ? TaskStatus.Completed
          : TaskStatus.InProgress;
      this.saveTasks();
    }
  }

}
