import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TimerSettingsService } from '../services/timer-settings.service';
import { TimerHistoryService } from '../services/timer-history.service';
import { TimerHistoryComponent } from './timer-history.component';
import { NotificationService } from '../services/notification.service';

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
  taskDescription: string = '';
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

    // Load saved task description from localStorage
    const savedTask = localStorage.getItem('currentTask');
    if (savedTask) {
      this.taskDescription = savedTask;
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
      this.timer = setInterval(() => {
        if (this.currentTimeInSeconds > 0) {
          this.currentTimeInSeconds--;
          this.updateDisplay();
        } else {
          clearInterval(this.timer);
          this.onTimerEnd();
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
  }

  stopTimer() {
    if (this.isRunning) {
      this.addHistoryEntry(false);
    }
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
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

  playNotification() {
    const audio = new Audio('assets/notification.mp3');
    audio.play().catch(error => console.log('Error playing notification:', error));
  }

  updateTaskDescription(description: string) {
    this.taskDescription = description;
    localStorage.setItem('currentTask', description);
  }

  clearTaskDescription() {
    this.taskDescription = '';
    localStorage.removeItem('currentTask');
  }

  private addHistoryEntry(isSuccessful: boolean) {
    if (this.timerStartTime) {
      this.timerHistoryService.addEntry({
        startTime: this.timerStartTime,
        type: this.currentMode,
        isSuccessful,
        taskDescription: this.currentMode === 'work' ? this.taskDescription : '' // Only add task description for work intervals
      });
      this.timerStartTime = null;
    }
  }

  onTimerEnd() {
    this.addHistoryEntry(true); // Mark the entry as successful
    this.notificationService.showNotification('Pomodoro Timer', {
      body: 'Time is up!',
      icon: 'assets/icons/timer-icon.png', // Optional: Add an icon for the notification
    }).then(notification => {
      notification.addEventListener('click', () => {
        this.toggleTimer();
      });
    });

    if (this.currentMode === 'work') {
      this.workIntervalCount++;
      if (this.workIntervalCount >= this.workIntervalsBeforeLongBreak) {
        this.setMode('longBreak');
        this.workIntervalCount = 0; // Reset the counter after a long break
      } else {
        this.setMode('shortBreak');
      }
    } else {
      this.setMode('work');
    }
  }
}