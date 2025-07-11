import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core'; // Added Inject, PLATFORM_ID
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Added isPlatformBrowser
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TimerSettingsService } from '../../services/timer-settings.service';
// -- IMPORT ANGULAR MATERIAL MODULES --
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// -- END IMPORT ANGULAR MATERIAL MODULES --
import { TimerHistoryService } from '../../services/timer-history.service';
import { NotificationService } from '../../services/notification.service';
import { TaskService } from '../../services/task.service';
import { Task, TaskStatus } from '../../models/task.model';

interface TimerState {
  endTimestamp: number | null;
  remainingSeconds: number;
  mode: 'work' | 'shortBreak' | 'longBreak';
  isRunning: boolean;
  selectedTaskId: string;
  workIntervalCount: number;
  startTimeTimestamp: number | null; // Added to store the start time
}

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // -- ADD ANGULAR MATERIAL MODULES --
    MatCardModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
    // -- END ADD ANGULAR MATERIAL MODULES --
  ],
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss']
})
export class TimerComponent implements OnInit, OnDestroy {
  currentMode: 'work' | 'shortBreak' | 'longBreak' = 'work';
  minutes: string = '25';
  seconds: string = '00';
  isRunning: boolean = false;
  timer: any;
  settingsSubscription!: Subscription;  currentTimeInSeconds: number = 1500; // 25 minutes in seconds
  settings: any;
  private timerStartTime: Date | null = null;
  private timerEndTimestamp: number | null = null;
  taskDescription: string = '';
  tasks: Task[] = [];
  selectedTaskId: string = '';
  private workIntervalCount: number = 0;
  private readonly workIntervalsBeforeLongBreak: number = 4; // Adjust as needed
  private isBrowser: boolean; // To check if running in browser
  private audioContextUnlocked = false; // Flag for audio unlock
  private notificationAudio: HTMLAudioElement | null = null; // Audio object
  private tasksSubscription: Subscription = new Subscription();
  private hasRestoredInitialTaskSelection: boolean = false;

  constructor(
    private timerSettingsService: TimerSettingsService,
    private timerHistoryService: TimerHistoryService,
    private notificationService: NotificationService,
    private taskService: TaskService, // Add TaskService
    @Inject(PLATFORM_ID) private platformId: Object // Inject PLATFORM_ID
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId); // Check if browser
    if (this.isBrowser) {
        // Initialize Audio only in the browser
        this.notificationAudio = new Audio('assets/notification.mp3');
        this.notificationAudio.load(); // Preload
    }
  }
  ngOnInit() {
    this.settingsSubscription = this.timerSettingsService.getSettings().subscribe(settings => {
      this.settings = settings;
      // Only reset if no state is restored
      // if (!this.restoreState()) { // Temporarily disable restoreState to avoid conflicts during refactor
      //   this.resetTimer();
      // }
      // Ensure resetTimer is called if restoreState isn't or doesn't set things up.
      // For now, let's assume resetTimer should be called if not restoring.
      if (!this.isBrowser || !localStorage.getItem('timerState')) {
        this.resetTimer(); // Initial setup if no saved state
      } else {
        if (!this.restoreState()) { // Attempt to restore, if it fails (e.g. returns false), then reset.
            this.resetTimer();
        }
      }
    });    // Subscribe to active tasks from TaskService instead of using localStorage directly
    this.tasksSubscription = this.taskService.activeTasks$.subscribe(activeTasks => {
      this.tasks = activeTasks;

      if (!this.hasRestoredInitialTaskSelection && this.isBrowser) {
        this.hasRestoredInitialTaskSelection = true; // Prevent re-entry for this specific logic path

        const savedId = localStorage.getItem('currentTaskId');
        const currentTaskIsValidAndExists = savedId && savedId !== '' && this.tasks.some(t => t.id === savedId);

        if (currentTaskIsValidAndExists) {
          // A task was previously selected and exists in the current task list.
          // Ensure the component's state reflects this.
          if (this.selectedTaskId !== savedId) {
            this.selectedTaskId = savedId;
            const task = this.tasks.find(t => t.id === savedId);
            if (task) this.taskDescription = task.description;
          }
          // Ensure the task service knows this task is in progress.
          this.taskService.setTaskInProgress(savedId!); // savedId is checked to be non-null by currentTaskIsValidAndExists
        } else {
          // No valid task found in localStorage to restore, or it doesn't exist anymore.
          // If a task is somehow selected in the component's model, clear it.
          if (this.selectedTaskId !== '') {
            this.selectedTaskId = '';
            this.taskDescription = '';
            this.taskService.setTaskInProgress(null);
          }
          // Ensure localStorage is also cleared if it had an invalid/stale ID
          if (savedId) { // If there was a savedId but it was invalid or task doesn't exist
              localStorage.removeItem('currentTaskId');
          }
        }
      }
    });

    // Listen for notification action events (keep existing logic)
    if (this.isBrowser && 'serviceWorker' in navigator) {
       navigator.serviceWorker.addEventListener('message', (event) => {
         if (event.data && event.data.action === 'startNextInterval') {
           this.toggleTimer(); // Consider if this needs adjustment with state saving
         }
       });
    }
  }
  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
    if (this.tasksSubscription) {
      this.tasksSubscription.unsubscribe();
    }
    // Don't stop timer here, let state persistence handle it
    // this.stopTimer();
    if (this.timer) {
      clearInterval(this.timer); // Still clear interval on destroy
    }
  }
  private saveState() {
    if (!this.isBrowser) return; // Don't save state on server

    const state: TimerState = {
      endTimestamp: this.timerEndTimestamp,
      remainingSeconds: this.currentTimeInSeconds,
      mode: this.currentMode,
      isRunning: this.isRunning,
      selectedTaskId: this.selectedTaskId, // May be empty string
      workIntervalCount: this.workIntervalCount,
      startTimeTimestamp: this.timerStartTime?.getTime() || null // Save timestamp
    };
    localStorage.setItem('timerState', JSON.stringify(state));

    // Handle currentTaskId separately for task component use
    if (this.selectedTaskId) {
        localStorage.setItem('currentTaskId', this.selectedTaskId);
    } else {
        // If no task is selected, make sure to remove it from localStorage
        localStorage.removeItem('currentTaskId');
    }
  }

  private restoreState(): boolean {
    if (!this.isBrowser) return false; // Don't restore state on server

    const savedState = localStorage.getItem('timerState');
    if (savedState) {
      try {
        const state: TimerState = JSON.parse(savedState);        this.currentMode = state.mode;

        // Only restore task if it's valid and exists
        if (state.selectedTaskId && state.selectedTaskId !== '' &&
            this.tasks.some(t => t.id === state.selectedTaskId)) {
          this.selectedTaskId = state.selectedTaskId;
          this.taskDescription = this.tasks.find(t => t.id === state.selectedTaskId)?.description || '';

          // Set the task to InProgress
          this.taskService.setTaskInProgress(state.selectedTaskId);
        } else {
          // If no valid task or if "--Select Task--" was selected
          this.selectedTaskId = '';
          this.taskDescription = '';
          this.taskService.setTaskInProgress(null);
        }

        this.workIntervalCount = state.workIntervalCount || 0;
        // Restore timerStartTime if it was saved
        this.timerStartTime = state.startTimeTimestamp ? new Date(state.startTimeTimestamp) : null;


        if (state.isRunning && state.endTimestamp) {
          const now = Date.now();
          const remaining = Math.max(0, Math.round((state.endTimestamp - now) / 1000));
          if (remaining > 0) {
            this.currentTimeInSeconds = remaining;
            this.timerEndTimestamp = state.endTimestamp;
            this.isRunning = true;
            // Ensure timerStartTime is set if restoring a running timer
            if (!this.timerStartTime && state.startTimeTimestamp) {
                 this.timerStartTime = new Date(state.startTimeTimestamp);
            }
            this.startTimerInterval(); // Start the interval without resetting timestamps
            this.updateDisplay();
            return true; // State restored and running
          } else {
            // Timer finished while the page was closed/reloaded
            this.currentTimeInSeconds = 0;
            this.updateDisplay();
            // Treat it as if it just ended *now*.
            // Pass the original start time if available for history accuracy
            const originalStartTime = this.timerStartTime;
            this.timerStartTime = null; // Clear start time before calling onTimerEnd
            this.onTimerEnd(true, originalStartTime ?? undefined); // Pass flag and potentially original start time
            return true; // State processed (ended)
          }
        } else if (!state.isRunning && state.remainingSeconds > 0) {
          // Restore paused state
          this.currentTimeInSeconds = state.remainingSeconds;
          this.isRunning = false;
          this.timerEndTimestamp = null; // Ensure timestamp is null for paused
          // Keep restored timerStartTime if paused (might be needed if resumed later)
          this.updateDisplay();
          return true; // State restored (paused)
        } else {
           // Timer was stopped or finished, clear state and reset
           this.clearState();
           return false; // State was invalid or stopped, proceed with normal init
        }

      } catch (e) {
        console.error("Error restoring timer state:", e);
        this.clearState(); // Clear corrupted state
        return false; // Error parsing, proceed with normal init
      }
    }
    return false; // No state found
  }

  private clearState() {
    if (!this.isBrowser) return;
    localStorage.removeItem('timerState');
    // Keep currentTaskId removal separate?
    // localStorage.removeItem('currentTaskId'); // Let's manage this separately for now
    // Reset component state variables explicitly
    this.timerEndTimestamp = null;
    this.isRunning = false;
    this.timerStartTime = null; // Clear start time as well
    // Don't reset mode or selected task here, let resetTimer handle defaults
  }

  setMode(mode: 'work' | 'shortBreak' | 'longBreak') {
    this.currentMode = mode;
    this.stopTimer(); // Stop timer also clears state and resets
    this.saveState(); // Save the new mode and stopped state
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
       // Attempt to unlock audio on the first *user-initiated* start
      if (this.isBrowser && !this.audioContextUnlocked) {
        this.unlockAudioContext();
      }

      this.isRunning = true;
      this.timerStartTime = new Date(); // Keep track of session start time for history
      // Calculate end timestamp only if it's not already set (i.e., not resuming)
      if (!this.timerEndTimestamp) {
         this.timerEndTimestamp = Date.now() + this.currentTimeInSeconds * 1000;
      }
      this.startTimerInterval();
      this.saveState(); // Save running state
    }
  }

  // Extracted interval logic
  private startTimerInterval() {
     if (this.timer) { // Clear any existing interval first
       clearInterval(this.timer);
     }
     this.timer = setInterval(() => {
       if (this.timerEndTimestamp) {
         const now = Date.now();
         const remaining = Math.max(0, Math.round((this.timerEndTimestamp - now) / 1000));
         this.currentTimeInSeconds = remaining;
         this.updateDisplay();
         // Save state periodically? Or rely on pause/stop/destroy? Let's save less frequently for now.
         // this.saveState(); // Saving every second might be excessive

         if (remaining <= 0) {
           clearInterval(this.timer);
           this.onTimerEnd();
         }
       } else {
         // Should not happen if timer is running, maybe clear interval?
         console.warn("Timer interval running without an end timestamp!");
         clearInterval(this.timer);
         this.isRunning = false; // Correct state
         this.resetTimer(); // Reset to be safe
         this.saveState();
       }
     }, 1000);
  }

  pauseTimer() {
    // Only add history if it was actually running for a bit
    if (this.isRunning && this.timerStartTime) {
       this.addHistoryEntry(false); // Log pause as unsuccessful completion of interval
       // Don't nullify timerStartTime here, keep it for potential resume
    }
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Update remaining seconds based on timestamp before clearing it
    if (this.timerEndTimestamp) {
      const now = Date.now();
      this.currentTimeInSeconds = Math.max(0, Math.round((this.timerEndTimestamp - now) / 1000));
      this.timerEndTimestamp = null; // Clear timestamp for paused state
    }
    this.updateDisplay(); // Ensure display updates on pause
    this.saveState(); // Save paused state (including timerStartTime)
  }
  stopTimer() {
    // Only add history if it was actually running for a bit
    if (this.isRunning && this.timerStartTime) {
      this.addHistoryEntry(false); // Log stop as unsuccessful completion
    }
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timerEndTimestamp = null;
    this.timerStartTime = null; // Explicitly clear start time on stop
    this.resetTimer(); // Reset time based on current mode
    this.clearState(); // Clear saved state from localStorage

    // Ensure the task remains in progress if selected
    if (this.selectedTaskId) {
      this.taskService.setTaskInProgress(this.selectedTaskId);
    }

    // Save the reset state (stopped, default time for mode, null start time)
    this.saveState();
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
    this.timerEndTimestamp = null; // Ensure timestamp is cleared on reset
    this.isRunning = false; // Ensure running is false
    this.timerStartTime = null; // Ensure start time is null on reset
    this.updateDisplay();
    // Don't save state here, let callers handle saving after reset if needed (like stopTimer, setMode)
  }

  updateDisplay() {
    const minutes = Math.floor(this.currentTimeInSeconds / 60);
    const seconds = this.currentTimeInSeconds % 60;
    this.minutes = minutes.toString();
    this.seconds = seconds < 10 ? `0${seconds}` : seconds.toString();
  }  // Handle selection of a task
  onTaskChange(taskId: string) {
    // this.selectedTaskId = taskId; // This line is redundant because [(ngModel)] already updated selectedTaskId.
    console.log('Task changed to:', taskId); // Debug log

    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        this.taskDescription = task.description;
        // Set the selected task to InProgress and all others to Queued
        this.taskService.setTaskInProgress(taskId);
      } else {
        console.warn('Selected task not found in tasks array:', taskId);
      }
    } else {
      // Clear task information and ensure all tasks are set to Queued when "-- Select Task --" is chosen
      this.taskDescription = '';
      this.taskService.setTaskInProgress(null);

      // Remove from localStorage to prevent it from being restored
      localStorage.removeItem('currentTaskId');
    }
    this.saveState(); // Save state when task changes
  }

  trackTaskById(index: number, task: Task): string {
    return task.id;
  }

  private addHistoryEntry(isSuccessful: boolean, explicitStartTime?: Date) {
    const startTimeToUse = explicitStartTime ?? this.timerStartTime; // Use explicit if provided
    if (startTimeToUse) {
      this.timerHistoryService.addEntry({
        startTime: startTimeToUse, // Use the determined start time
        type: this.currentMode,
        isSuccessful,
        taskDescription: this.taskDescription,
        taskId: this.selectedTaskId || undefined
      });
      // Only nullify the component's timerStartTime if we used it (not an explicit one)
      if (!explicitStartTime) {
          this.timerStartTime = null;
      }
    }
  }

  // Modify onTimerEnd slightly to handle restored end and save state
  onTimerEnd(wasRestoredEnd: boolean = false, originalStartTime?: Date) {
    if (!wasRestoredEnd) {
        // Use the component's timerStartTime for natural end
        this.addHistoryEntry(true);
    } else if (originalStartTime) {
        // Use the passed originalStartTime for restored end
        this.addHistoryEntry(true, originalStartTime);
    }

    // Play sound!
    this.playNotificationSound();

    // Update completed intervals on selected task
    if (this.currentMode === 'work' && this.selectedTaskId) {
      const taskIndex = this.tasks.findIndex(t => t.id === this.selectedTaskId);
      if (taskIndex > -1) {
        const task = this.tasks[taskIndex];
        const updatedCompletedIntervals = (task.completedIntervals || 0) + 1;
        let newStatus = task.completionStatus;

        if (typeof task.workIntervals === 'number') {
          newStatus = updatedCompletedIntervals >= task.workIntervals ? TaskStatus.Completed : TaskStatus.InProgress;
        } else if (task.workIntervals === '∞' || task.workIntervals === '?') {
          newStatus = TaskStatus.InProgress; // Remains InProgress for special cases
        }        // Use TaskService to update tasks
        const allTasks = this.taskService.getAllTasks();
        const taskIndexInAll = allTasks.findIndex(t => t.id === this.selectedTaskId);

        if (taskIndexInAll > -1) {
          allTasks[taskIndexInAll] = {
            ...allTasks[taskIndexInAll],
            completedIntervals: updatedCompletedIntervals,
            completionStatus: newStatus
          };

          this.taskService.saveTasks(allTasks);
        }
      }
    }

    let nextMode: 'work' | 'shortBreak' | 'longBreak';
    let nextDuration: number;
    let notificationBody: string;

    const endedMode = this.currentMode; // Store the mode that just ended

    if (endedMode === 'work') {
      this.workIntervalCount++;
      // localStorage.setItem('workIntervalCount', this.workIntervalCount.toString()); // Saved in saveState

      if (this.workIntervalCount >= this.workIntervalsBeforeLongBreak) {
        nextMode = 'longBreak';
        nextDuration = this.settings?.longBreakDuration || 15;
        notificationBody = `Work finished! Time for a long break (${nextDuration} minutes).`;
        this.workIntervalCount = 0; // Reset after long break is set
        // localStorage.setItem('workIntervalCount', '0'); // Saved in saveState
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

    // Set the next mode, which calls stopTimer -> resetTimer -> clearState -> saveState
    this.setMode(nextMode);

    // Show notification (only if not a restored end state)
    if (!wasRestoredEnd && this.isBrowser) {
        this.notificationService.showNotification('Pomodoro Timer', {
          body: notificationBody,
          icon: 'assets/timer-icon.svg',
          requireInteraction: true // Make notification persistent
        }).catch(error => {
          console.log('Notification service error:', error);
        });
    }
  }

  // --- Audio Methods ---

  private unlockAudioContext(): void {
    if (!this.isBrowser || !this.notificationAudio) return; // Guard clause

    this.notificationAudio.volume = 0; // Mute for unlock attempt
    const playPromise = this.notificationAudio.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            this.notificationAudio!.pause(); // Use non-null assertion
            this.notificationAudio!.currentTime = 0;
            this.notificationAudio!.volume = 1; // Reset volume
            this.audioContextUnlocked = true;
        }).catch(error => {
            console.error('[TimerComponent] Audio context unlock failed:', error);
             if (this.notificationAudio) this.notificationAudio.volume = 1; // Reset volume even if failed
        });
    } else {
         console.warn('[TimerComponent] Audio unlock: play() did not return a promise.');
         if (this.notificationAudio) this.notificationAudio.volume = 1; // Reset volume
    }
  }

  private playNotificationSound(): void {
    if (!this.isBrowser || !this.notificationAudio) return; // Guard clause

    if (!this.audioContextUnlocked) {
        console.warn('[TimerComponent] Audio context may not be unlocked. Playback might fail.');
    }

    this.notificationAudio.currentTime = 0; // Reset playback position
    this.notificationAudio.volume = 1; // Ensure volume is audible (use setting later?)

    const playPromise = this.notificationAudio.play();

     if (playPromise !== undefined) {
        playPromise.then(_ => {
        }).catch(error => {
            console.error('[TimerComponent] Error playing notification sound:', error);
        });
    } else {
         console.warn('[TimerComponent] Notification sound: play() did not return a promise.');
    }
  }

  // Method to get the current task object
  getCurrentTask(): Task | undefined {
    if (this.selectedTaskId) {
      return this.tasks.find(task => task.id === this.selectedTaskId);
    }
    return undefined;
  }

  // Method to check if task interval value is special (infinity or unknown)
  isSpecialIntervalValue(value: string | number | undefined): boolean {
    return value === '∞' || value === '?' || value === undefined;
  }
  // Method to mark the current task as completed
  completeTask(): void {
    if (this.selectedTaskId) {
      const allTasks = this.taskService.getAllTasks();
      const taskIndex = allTasks.findIndex(t => t.id === this.selectedTaskId);

      if (taskIndex > -1) {
        const updatedTask = {
          ...allTasks[taskIndex],
          completionStatus: TaskStatus.Completed,
          dateCompleted: new Date()
        };

        allTasks[taskIndex] = updatedTask;
        this.taskService.saveTasks(allTasks);

        // Clear the selected task since it's now completed
        this.selectedTaskId = '';
        this.taskDescription = '';
        this.saveState(); // Save the updated state
      }
    }
  }

  // Add this method to handle mode changes from mat-button-toggle-group
  onModeChange(newMode: 'work' | 'shortBreak' | 'longBreak'): void {
    if (!this.isRunning) { // Only allow mode change if timer is not running
      this.setMode(newMode);
    }
  }
}
