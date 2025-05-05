import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettingsService } from '../../services/timer-settings.service';
import { TimerHistoryService } from '../../services/timer-history.service';
import { Subscription } from 'rxjs';
import { TimerHistoryComponent } from '../timer-history/timer-history.component';
import { Task } from '../../models/task.model';

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
  tasks: Task[] = [];
  selectedTaskId: string = '';
  private audioContextUnlocked = false; // Flag to track if audio is unlocked
  private notificationAudio: HTMLAudioElement; // Declare Audio object property

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
    // Initialize the Audio object here
    this.notificationAudio = new Audio('assets/notification.mp3');
    this.notificationAudio.load(); // Preload the audio
  }

  ngOnInit(): void {
    // Load tasks list and saved selection
    const savedTasks = localStorage.getItem('tasks');
    this.tasks = savedTasks
      ? JSON.parse(savedTasks).map((t: any) => ({ ...t, dateCreated: new Date(t.dateCreated) }))
      : [];
    const savedId = localStorage.getItem('currentTaskId');
    if (savedId && this.tasks.find(t => t.id === savedId)) {
      this.selectedTaskId = savedId;
      this.taskDescription = this.tasks.find(t => t.id === savedId)!.description;
    }

    // Get work interval count
    const savedCount = localStorage.getItem('workIntervalCount');
    if (savedCount) {
      this.workIntervalCount = parseInt(savedCount, 10);
    }

    // Attempt to unlock audio context silently if possible (might not work)
    // this.unlockAudioContext(true); // Pass true for silent attempt
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
      console.log('[TimerComponent] startTimer called, isRunning=false'); // Log entry
      // Attempt to unlock audio on the first *user-initiated* start
      if (!this.audioContextUnlocked) {
        console.log('[TimerComponent] Attempting to call unlockAudioContext...'); // Log before call
        this.unlockAudioContext();
      } else {
         console.log('[TimerComponent] Audio context already unlocked.');
      }

      this.isRunning = true;
      this.timerStartTime = new Date();
      console.log('[TimerComponent] Starting setInterval...'); // Log before interval
      this.timerInterval = setInterval(() => {
        // console.log(`[TimerComponent] Interval tick: ${this.minutes}:${this.seconds}`); // Optional: very verbose logging
        if (this.seconds > 0) {
          this.seconds--;
        } else if (this.minutes > 0) {
          this.minutes--;
          this.seconds = 59;
        } else {
          // Interval reached zero
          console.log('[TimerComponent] Timer reached zero, calling onTimerEnd...'); // Log before call
          this.onTimerEnd();
        }
      }, 1000);
    } else {
       console.log('[TimerComponent] startTimer called, but already running.');
    }
  }

  stopTimer(): void {
    // Only add history entry if timer was running and stopped manually
    if (this.isRunning) {
       this.addHistoryEntry(false); // Log incomplete interval if stopped manually
    }
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null; // Clear the interval reference
    }
     // Reset start time when stopped manually
    this.timerStartTime = null;
  }

  resetTimer(): void {
    this.stopTimer(); // Stop first
    this.setTimeForMode(this.currentMode); // Then reset time
  }

  // Handle task selection
  onTaskChange(taskId: string): void {
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

  formatTime(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }

  onTimerEnd(): void {
    console.log('[TimerComponent] onTimerEnd called.'); // Log entry
    // Clear the interval *before* potentially starting the next one
    if (this.timerInterval) {
        console.log('[TimerComponent] Clearing interval in onTimerEnd.');
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }
    this.isRunning = false; // Mark as not running

    this.addHistoryEntry(true); // Log successful interval
    console.log('[TimerComponent] Attempting to call playNotificationSound...'); // Log before call
    this.playNotificationSound(); // Play sound

    let nextMode: TimerMode;
    if (this.currentMode === TimerMode.WORK) {
      this.workIntervalCount++;
      localStorage.setItem('workIntervalCount', this.workIntervalCount.toString());

      if (this.workIntervalCount >= (this.settings?.longBreakInterval || 4)) {
        nextMode = TimerMode.LONG_BREAK;
        this.workIntervalCount = 0; // Reset count for long break
        localStorage.setItem('workIntervalCount', '0');
      } else {
        nextMode = TimerMode.SHORT_BREAK;
      }
    } else {
      nextMode = TimerMode.WORK;
    }
    console.log(`[TimerComponent] Setting next mode to: ${nextMode}`);
    this.setTimeForMode(nextMode);
  }

  private addHistoryEntry(isSuccessful: boolean): void {
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

  private unlockAudioContext(): void {
    // Use the existing audio object
    console.log('[TimerComponent] Inside unlockAudioContext method.'); // Log entry
    // Ensure volume is 0 for the unlock attempt
    this.notificationAudio.volume = 0;
    const playPromise = this.notificationAudio.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            this.notificationAudio.pause(); // Pause immediately after unlock
            this.notificationAudio.currentTime = 0; // Reset time
            this.notificationAudio.volume = 1; // Reset volume for actual playback later
            this.audioContextUnlocked = true;
            console.log('Audio context unlocked by user interaction.');
        }).catch(error => {
            console.error('Audio context unlock failed:', error);
             this.notificationAudio.volume = 1; // Reset volume even if unlock failed
            // Might still fail later
        });
    } else {
         console.warn('Audio unlock: play() did not return a promise.');
         this.notificationAudio.volume = 1; // Reset volume
    }
  }

  private playNotificationSound(): void {
     console.log('[TimerComponent] Inside playNotificationSound method.'); // Log entry
    // Ensure volume is audible
    this.notificationAudio.volume = 1; // Or use a setting

    const playPromise = this.notificationAudio.play();

     if (playPromise !== undefined) {
        playPromise.then(_ => {
            console.log('Notification sound playback started.');
        }).catch(error => {
            console.error('Error playing notification sound:', error);
            // Inform user? e.g., display a message "Could not play sound."
        });
    } else {
         console.warn('Notification sound: play() did not return a promise.');
    }
  }
}
