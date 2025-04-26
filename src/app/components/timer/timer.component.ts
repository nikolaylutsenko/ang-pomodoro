import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettingsService } from '../../services/timer-settings.service';
import { TimerHistoryService } from '../../services/timer-history.service';
import { Subscription } from 'rxjs';
import { TimerHistoryComponent } from '../timer-history/timer-history.component';

export enum TimerMode {
  WORK = 'work',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak'
}

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, FormsModule, TimerHistoryComponent],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss'
})
export class TimerComponent implements OnInit, OnDestroy {
  minutes: number = 25;
  seconds: number = 0;
  isRunning: boolean = false;
  currentMode: TimerMode = TimerMode.WORK;
  TimerMode = TimerMode; // For template access
  private timerInterval: any;
  private settingsSubscription: Subscription;
  private settings: any;
  taskDescription: string = '';
  private timerStartTime: Date | null = null;
  private workIntervalCount: number = 0;

  constructor(
    private timerSettingsService: TimerSettingsService,
    private timerHistoryService: TimerHistoryService
  ) {
    this.settingsSubscription = this.timerSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
      if (!this.isRunning) {
        this.setTimeForMode(this.currentMode);
      }
    });
  }

  ngOnInit(): void {
    // Load saved task description from localStorage
    const savedTask = localStorage.getItem('currentTask');
    if (savedTask) {
      this.taskDescription = savedTask;
    }

    // Get work interval count
    const savedCount = localStorage.getItem('workIntervalCount');
    if (savedCount) {
      this.workIntervalCount = parseInt(savedCount, 10);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  setTimeForMode(mode: TimerMode): void {
    this.currentMode = mode;
    switch (mode) {
      case TimerMode.WORK:
        this.minutes = this.settings?.workDuration || 25;
        break;
      case TimerMode.SHORT_BREAK:
        this.minutes = this.settings?.shortBreakDuration || 5;
        break;
      case TimerMode.LONG_BREAK:
        this.minutes = this.settings?.longBreakDuration || 15;
        break;
    }
    this.seconds = 0;
  }

  startTimer(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timerStartTime = new Date();
      this.timerInterval = setInterval(() => {
        if (this.seconds > 0) {
          this.seconds--;
        } else if (this.minutes > 0) {
          this.minutes--;
          this.seconds = 59;
        } else {
          this.stopTimer();
          this.onTimerEnd();
        }
      }, 1000);
    }
  }

  stopTimer(): void {
    if (this.isRunning) {
      this.addHistoryEntry(false);
    }
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resetTimer(): void {
    this.stopTimer();
    this.setTimeForMode(this.currentMode);
  }

  updateTaskDescription(description: string): void {
    this.taskDescription = description;
    localStorage.setItem('currentTask', description);
  }

  clearTaskDescription(): void {
    this.taskDescription = '';
    localStorage.removeItem('currentTask');
  }

  formatTime(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }

  onTimerEnd(): void {
    this.addHistoryEntry(true);
    this.playNotificationSound();

    let nextMode: TimerMode;
    if (this.currentMode === TimerMode.WORK) {
      this.workIntervalCount++;
      localStorage.setItem('workIntervalCount', this.workIntervalCount.toString());

      if (this.workIntervalCount >= (this.settings?.longBreakInterval || 4)) {
        nextMode = TimerMode.LONG_BREAK;
        this.workIntervalCount = 0;
        localStorage.setItem('workIntervalCount', '0');
      } else {
        nextMode = TimerMode.SHORT_BREAK;
      }
    } else {
      nextMode = TimerMode.WORK;
    }

    this.setTimeForMode(nextMode);
    
    // Automatically start the next timer if the setting is enabled
    if (this.settings?.autoStartNextInterval) {
      // Use setTimeout to allow the UI to update before starting the timer
      setTimeout(() => this.startTimer(), 100);
    }
  }

  private addHistoryEntry(isSuccessful: boolean): void {
    if (this.timerStartTime) {
      this.timerHistoryService.addEntry({
        startTime: this.timerStartTime,
        type: this.currentMode,
        isSuccessful,
        taskDescription: this.taskDescription
      });
      this.timerStartTime = null;
    }
  }

  private playNotificationSound(): void {
    const audio = new Audio('assets/notification.mp3');
    audio.play().catch(error => console.log('Error playing notification sound:', error));
  }
}
