import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';
import packageJson from '../../package.json';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateTaskComponent } from './components/tasks/create-task/create-task.component';
import { TaskService } from './services/task.service';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavComponent,
    MatTabsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    CreateTaskComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Pomodoro';
  isDarkModeActive = false; // Single property for theme state, default to false (light)
  version: string = packageJson.version;
  showCreateTaskModal = false;
  taskToEdit: any = null;

  constructor(private taskService: TaskService) {}

  ngOnInit() {
    // asks for permission to show notifications
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // console.log('Notification permission granted.'); // REMOVED
        } else {
          // console.log('Notification permission denied.'); // REMOVED
        }
      });
    }

    // Check if there's a saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkModeActive = savedTheme === 'dark';
    } // If no savedTheme, isDarkModeActive remains its default (false for light)
    this.applyTheme(); // Apply initial theme
  }

  toggleTheme() {
    this.isDarkModeActive = !this.isDarkModeActive;
    localStorage.setItem('theme', this.isDarkModeActive ? 'dark' : 'light');
    this.applyTheme();
  }

  openCreateTaskModal() {
    this.taskToEdit = null;
    this.showCreateTaskModal = true;
  }

  closeCreateTaskModal() {
    this.showCreateTaskModal = false;
    this.taskToEdit = null;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKeydown(event: KeyboardEvent) {
    if (this.showCreateTaskModal) {
      this.closeCreateTaskModal();
    }
  }

  handleTaskSaved(taskData: Partial<Task>) {
    // Use existing task service logic from TasksComponent
    const allTasks = this.taskService.getAllTasks();

    if (taskData.id) {
      // Editing existing task
      const idx = allTasks.findIndex(t => t.id === taskData.id);
      if (idx > -1) {
        const updatedTask = {
          ...allTasks[idx],
          description: taskData.description!,
          urgency: taskData.urgency!,
          estimatedHours: taskData.estimatedHours!,
          workIntervals: taskData.workIntervals!,
        };
        allTasks[idx] = updatedTask;
      }
    } else {
      // Adding new task
      const currentActiveTasks = this.taskService.getActiveTasksSubject().getValue();
      const newPriority = currentActiveTasks.length > 0
        ? Math.max(...currentActiveTasks.map(t => t.priority)) + 1
        : 1;

      const newTask: Task = {
        id: crypto.randomUUID(),
        description: taskData.description!,
        urgency: taskData.urgency!,
        dateCreated: new Date(),
        estimatedHours: taskData.estimatedHours!,
        workIntervals: taskData.workIntervals!,
        completedIntervals: 0,
        completionStatus: 'Created' as any,
        priority: newPriority,
        dateCompleted: null
      };
      allTasks.push(newTask);
    }

    this.taskService.saveTasks(allTasks);
    this.closeCreateTaskModal();
  }

  private applyTheme() {
    if (this.isDarkModeActive) {
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.removeAttribute('data-theme');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
    // This will trigger a reflow and ensure all CSS variables are properly updated
    document.body.classList.add('theme-transition');
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 300);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeCreateTaskModal();
    }
  }
}
