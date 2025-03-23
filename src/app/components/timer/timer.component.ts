import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerSettingsService } from '../../services/timer-settings.service';
import { Subscription } from 'rxjs';

export enum TimerMode {
  WORK = 'work',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak'
}

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule],
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

  constructor(private timerSettingsService: TimerSettingsService) {
    this.settingsSubscription = this.timerSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
      if (!this.isRunning) {
        this.setTimeForMode(this.currentMode);
      }
    });
  }

  ngOnInit(): void {
    // Timer is initialized through the settings subscription
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
        this.minutes = this.settings.workDuration;
        break;
      case TimerMode.SHORT_BREAK:
        this.minutes = this.settings.shortBreakDuration;
        break;
      case TimerMode.LONG_BREAK:
        this.minutes = this.settings.longBreakDuration;
        break;
    }
    this.seconds = 0;
  }

  startTimer(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.timerInterval = setInterval(() => {
        if (this.seconds > 0) {
          this.seconds--;
        } else if (this.minutes > 0) {
          this.minutes--;
          this.seconds = 59;
        } else {
          this.stopTimer();
          this.playNotificationSound();
        }
      }, 1000);
    }
  }

  stopTimer(): void {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resetTimer(): void {
    this.stopTimer();
    this.setTimeForMode(this.currentMode);
  }

  formatTime(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }

  private playNotificationSound(): void {
    const audio = new Audio('assets/notification.mp3');
    audio.play().catch(error => console.log('Error playing notification sound:', error));
  }
}
