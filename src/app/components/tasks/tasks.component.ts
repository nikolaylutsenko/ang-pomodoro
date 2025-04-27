import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskPriority } from '../../models/task.model';

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
  formTask: Partial<Task> = { description: '', priority: TaskPriority.Low };
  editingTaskId: string | null = null;

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    const data = localStorage.getItem('tasks');
    this.tasks = data ? JSON.parse(data).map((t: any) => ({ ...t, dateCreated: new Date(t.dateCreated) })) : [];
  }

  saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }

  addOrUpdateTask() {
    if (!this.formTask.description || this.formTask.priority === undefined || this.formTask.priority === null) return;
    let priority: TaskPriority = this.formTask.priority as TaskPriority;
    if (this.editingTaskId) {
      // Edit
      const idx = this.tasks.findIndex(t => t.id === this.editingTaskId);
      if (idx > -1) {
        this.tasks[idx].description = this.formTask.description!;
        this.tasks[idx].priority = priority;
        this.saveTasks();
      }
      this.editingTaskId = null;
    } else {
      // Add
      const newTask: Task = {
        id: crypto.randomUUID(),
        description: this.formTask.description!,
        priority,
        dateCreated: new Date()
      };
      this.tasks.push(newTask);
      this.saveTasks();
    }
    this.formTask = { description: '', priority: TaskPriority.Low };
  }

  editTask(task: Task) {
    this.formTask = { description: task.description, priority: task.priority };
    this.editingTaskId = task.id;
  }

  deleteTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    if (this.editingTaskId === id) {
      this.editingTaskId = null;
      this.formTask = { description: '', priority: TaskPriority.Low };
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
}
