import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TimerSettingsService } from '../services/timer-settings.service';
import { TimerHistoryService } from '../services/timer-history.service';
import { TimerHistoryComponent } from './timer-history.component';
import { NotificationService } from '../services/notification.service';
import { Task, TaskStatus } from '../models/task.model';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, FormsModule, TimerHistoryComponent],
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss']
})
export class TimerComponent implements OnInit, OnDestroy {
  currentMode: 'work' | 'shortBreak' | 'longBreak' = 'work';
  minutes: string = '25';
  seconds: string = '00';
  isRunning: boolean = false;
  timer: any;
  settingsSubscription!: Subscription;
  currentTimeInSeconds: number = 1500; // 25 minutes in seconds
  settings: any;
  private timerStartTime: Date | null = null;
  private timerEndTimestamp: number | null = null;
  taskDescription: string = '';
  tasks: Task[] = [];
  selectedTaskId: string = '';
  private workIntervalCount: number = 0;
  private readonly workIntervalsBeforeLongBreak: number = 4; // Adjust as needed

  constructor(
    private timerSettingsService: TimerSettingsService,
    private timerHistoryService: TimerHistoryService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.settingsSubscription = this.timerSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
      this.resetTimer();
    });

    // Load tasks list and saved selection
    const savedTasks = localStorage.getItem('tasks');
    this.tasks = savedTasks ? JSON.parse(savedTasks).map((t: any) => ({ ...t, dateCreated: new Date(t.dateCreated) })) : [];
    const savedId = localStorage.getItem('currentTaskId');
    if (savedId && this.tasks.some(t => t.id === savedId)) {
      this.selectedTaskId = savedId;
      this.taskDescription = this.tasks.find(t => t.id === savedId)!.description;
    }

    // Listen for notification action events
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.action === 'startNextInterval') {
        this.toggleTimer();
      }
    });
  }

  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
    this.stopTimer();
  }

  setMode(mode: 'work' | 'shortBreak' | 'longBreak') {
    if (this.isRunning) {
      this.addHistoryEntry(false);
    }
    this.currentMode = mode;
    this.stopTimer();
    this.resetTimer();
  }

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timerStartTime = new Date();
      // Calculate the end timestamp based on current time and remaining seconds
      this.timerEndTimestamp = Date.now() + this.currentTimeInSeconds * 1000;
      this.timer = setInterval(() => {
        if (this.timerEndTimestamp) {
          const now = Date.now();
          const remaining = Math.max(0, Math.round((this.timerEndTimestamp - now) / 1000));
          this.currentTimeInSeconds = remaining;
          this.updateDisplay();
          if (remaining <= 0) {
            clearInterval(this.timer);
            this.onTimerEnd();
          }
        }
      }, 1000);
    }
  }

  pauseTimer() {
    this.addHistoryEntry(false);
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Adjust currentTimeInSeconds in case of pause
    if (this.timerEndTimestamp) {
      const now = Date.now();
      this.currentTimeInSeconds = Math.max(0, Math.round((this.timerEndTimestamp - now) / 1000));
      this.timerEndTimestamp = null;
    }
  }

  stopTimer() {
    if (this.isRunning) {
      this.addHistoryEntry(false);
    }
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timerEndTimestamp = null;
    this.resetTimer();
  }

  resetTimer() {
    switch (this.currentMode) {
      case 'work':
        this.currentTimeInSeconds = this.settings?.workDuration * 60 || 1500;
        break;
      case 'shortBreak':
        this.currentTimeInSeconds = this.settings?.shortBreakDuration * 60 || 300;
        break;
      case 'longBreak':
        this.currentTimeInSeconds = this.settings?.longBreakDuration * 60 || 900;
        break;
    }
    this.updateDisplay();
  }

  updateDisplay() {
    const minutes = Math.floor(this.currentTimeInSeconds / 60);
    const seconds = this.currentTimeInSeconds % 60;
    this.minutes = minutes.toString();
    this.seconds = seconds < 10 ? `0${seconds}` : seconds.toString();
  }

  // Handle selection of a task
  onTaskChange(taskId: string) {
    this.selectedTaskId = taskId;
    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId)!;
      this.taskDescription = task.description;
      localStorage.setItem('currentTaskId', taskId);
    } else {
      this.taskDescription = '';
      localStorage.removeItem('currentTaskId');
    }
  }

  private addHistoryEntry(isSuccessful: boolean) {
    if (this.timerStartTime) {
      this.timerHistoryService.addEntry({
        startTime: this.timerStartTime,
        type: this.currentMode,
        isSuccessful,
        taskDescription: this.taskDescription,
        taskId: this.selectedTaskId || undefined
      });
      this.timerStartTime = null;
    }
  }

  onTimerEnd() {
    this.addHistoryEntry(true); // Add entry for the completed interval
    // Update completed intervals on selected task
    if (this.currentMode === 'work' && this.selectedTaskId) {
      const task = this.tasks.find(t => t.id === this.selectedTaskId);
      if (task) {
        task.completedIntervals = (task.completedIntervals || 0) + 1;
        task.completionStatus = task.completedIntervals >= task.workIntervals ? TaskStatus.Completed : TaskStatus.InProgress;
        // Persist updated tasks
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
      }
    }
    
    let nextMode: 'work' | 'shortBreak' | 'longBreak';
    let nextDuration: number;
    let notificationBody: string;

    const endedMode = this.currentMode; // Store the mode that just ended

    if (endedMode === 'work') {
      this.workIntervalCount++;
      localStorage.setItem('workIntervalCount', this.workIntervalCount.toString()); // Persist count

      if (this.workIntervalCount >= this.workIntervalsBeforeLongBreak) {
        nextMode = 'longBreak';
        nextDuration = this.settings?.longBreakDuration || 15;
        notificationBody = `Work finished! Time for a long break (${nextDuration} minutes).`;
        this.workIntervalCount = 0; // Reset after long break is set
        localStorage.setItem('workIntervalCount', '0'); // Persist reset count
      } else {
        nextMode = 'shortBreak';
        nextDuration = this.settings?.shortBreakDuration || 5;
        const remainingWorkIntervals = this.workIntervalsBeforeLongBreak - this.workIntervalCount;
        notificationBody = `Work finished! Time for a short break (${nextDuration} minutes). ${remainingWorkIntervals} more until a long break.`;
      }
    } else { // Ended a break
      nextMode = 'work';
      nextDuration = this.settings?.workDuration || 25;
      notificationBody = `Break's over! Time for work (${nextDuration} minutes).`;
    }

    this.setMode(nextMode); // Set the next mode *after* determining message and adding history

    // Show notification - Corrected icon path for built assets
    this.notificationService.showNotification('Pomodoro Timer', {
      body: notificationBody,
      icon: 'assets/timer-icon.svg' // Correct path relative to deployed app root
    }).then(notification => { // No need for 'as any' if service handles it
      // Event handling is managed by the service worker listener in ngOnInit
    }).catch(error => {
      // Error handling might still be relevant if showNotification itself rejects
      console.log('Notification service error:', error);
    });
  }
}