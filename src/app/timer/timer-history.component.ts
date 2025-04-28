import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TimerHistoryService, TimerHistoryEntry } from '../services/timer-history.service';

@Component({
  selector: 'app-timer-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-section">
      <!-- Header and buttons section (always visible) -->
      <div class="history-header-container">
        <div class="history-header">
          <h3>History</h3>
          <button class="clear-btn" (click)="clearHistory()" *ngIf="history.length > 0">
            Clear History
          </button>
        </div>

        <div class="history-legend">
          <div class="legend-item time-width">Time</div>
          <div class="legend-item task-width">Task</div>
          <div class="legend-item type-width">Type</div>
          <div class="legend-item status-width">Status</div>
        </div>
      </div>

      <!-- Scrollable history list -->
      <div class="history-list-container" *ngIf="history.length > 0; else noHistory">
        <div class="history-list">
          <div class="history-item" *ngFor="let entry of displayedHistory">
            <div class="entry-time time-width">
              {{ entry.startTime | date:'HH:mm' }}
            </div>
            <div class="entry-task task-width">
              {{ entry.taskDescription || '—' }}
            </div>
            <div class="entry-type type-width" [class]="entry.type">
              {{ entry.type === 'shortBreak' ? 'Short Break' : 
                 entry.type === 'longBreak' ? 'Long Break' : 'Work' }}
            </div>
            <div class="entry-status status-width" [class.successful]="entry.isSuccessful">
              {{ entry.isSuccessful ? '✓' : '×' }}
            </div>
          </div>
        </div>

        <!-- History pagination controls (always visible at bottom) -->
        <div class="history-controls">
          <button 
            class="show-more-btn" 
            *ngIf="!showAll && sortedHistory.length > 3"
            (click)="toggleShowAll()">
            Show all today's history ({{ sortedHistory.length - 3 }} more)
          </button>
          <button 
            class="show-more-btn" 
            *ngIf="showAll && sortedHistory.length > 3"
            (click)="toggleShowAll()">
            Show less
          </button>
        </div>
      </div>
      <ng-template #noHistory>
        <div class="no-history">
          No history yet
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .history-section {
      width: 58.333%;
      min-width: 700px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0 auto;
      padding: 2rem;
      max-height: 100%;
    }

    .history-header-container {
      width: 100%;
      position: sticky;
      top: 0;
      z-index: 10;
      background: #20232a; /* Match app background */
      padding-bottom: 0.5rem;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      width: 100%;

      h3 {
        margin: 0;
        font-weight: 500;
        font-size: 1.4rem;
        color: rgba(255, 255, 255, 0.9);
      }
    }

    .history-legend {
      display: flex;
      width: 100%;
      padding: 0.5rem 1.5rem;
      margin-bottom: 0.5rem;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .legend-item {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .time-width {
      width: 80px;
      flex-shrink: 0;
    }

    .task-width {
      flex: 1;
      min-width: 200px;
      padding-right: 1rem;
    }

    .type-width {
      width: 120px;
      flex-shrink: 0;
      text-align: center;
    }

    .status-width {
      width: 60px;
      flex-shrink: 0;
      text-align: center;
    }

    .clear-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: all 0.3s ease;

      &:hover {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .history-list-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      max-height: 400px;
      overflow: hidden;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      overflow-y: auto;
      max-height: calc(100% - 50px);
      padding-right: 5px; /* Prevent content from touching scrollbar */
    }

    .history-item {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      font-size: 1.1rem;
      width: 100%;
    }

    .entry-time {
      font-family: 'Roboto Mono', monospace;
      color: rgba(255, 255, 255, 0.9);
    }

    .entry-task {
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entry-type {
      font-weight: 500;
      text-align: center;

      &.work {
        color: #81c784;
      }

      &.shortBreak {
        color: #64b5f6;
      }

      &.longBreak {
        color: #ba68c8;
      }
    }

    .entry-status {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e57373;
      font-size: 1.2rem;

      &.successful {
        color: #81c784;
      }
    }

    .history-controls {
      width: 100%;
      padding: 0.75rem 0 0;
      position: relative; /* Changed from sticky to relative */
      bottom: auto; /* Remove sticky positioning */
      z-index: 5;
      background: #20232a; /* Match app background */
      margin-top: 1rem; /* Increased from 0.5rem */
    }

    .show-more-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0.75rem;
      width: 100%;
      text-align: center;
      border-radius: 8px;
      transition: all 0.3s ease;
      margin-bottom: 1rem; /* Add bottom margin for better spacing */

      &:hover {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .no-history {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      padding: 2rem;
      font-size: 1.3rem;
      width: 100%;
    }

    :host-context(.light-theme) {
      .history-header-container {
        background: #f8f9fa; /* Match light theme background */
      }
      
      .history-controls {
        background: #f8f9fa; /* Match light theme background */
      }
      
      .history-legend {
        color: rgba(0, 0, 0, 0.4);
      }

      .history-header h3 {
        color: rgba(0, 0, 0, 0.9);
      }

      .clear-btn {
        color: rgba(0, 0, 0, 0.5);

        &:hover {
          color: rgba(0, 0, 0, 0.8);
          background: rgba(0, 0, 0, 0.05);
        }
      }

      .history-item {
        background: rgba(0, 0, 0, 0.02);
      }

      .entry-time {
        color: rgba(0, 0, 0, 0.9);
      }

      .entry-task {
        color: rgba(0, 0, 0, 0.9);
      }

      .entry-type {
        &.work {
          color: #2e7d32;
        }

        &.shortBreak {
          color: #1976d2;
        }

        &.longBreak {
          color: #7b1fa2;
        }
      }

      .entry-status {
        color: #d32f2f;

        &.successful {
          color: #2e7d32;
        }
      }

      .show-more-btn {
        color: rgba(0, 0, 0, 0.5);

        &:hover {
          color: rgba(0, 0, 0, 0.8);
          background: rgba(0, 0, 0, 0.05);
        }
      }

      .no-history {
        color: rgba(0, 0, 0, 0.5);
      }
    }
    
    @media (max-width: 768px) {
      .history-section {
        width: 100%;
        min-width: unset;
        padding: 1rem;
      }
      
      .task-width {
        min-width: 120px;
      }
    }
  `]
})
export class TimerHistoryComponent implements OnInit, OnDestroy {
  history: TimerHistoryEntry[] = [];
  private historySubscription!: Subscription;
  showAll: boolean = false;

  constructor(private timerHistoryService: TimerHistoryService) {}

  get sortedHistory(): TimerHistoryEntry[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return [...this.history]
      .filter(entry => entry.startTime >= today)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  get displayedHistory(): TimerHistoryEntry[] {
    return this.showAll ? this.sortedHistory : this.sortedHistory.slice(0, 3);
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
  }

  ngOnInit() {
    this.historySubscription = this.timerHistoryService.getHistory()
      .subscribe(history => {
        this.history = history;
      });
  }

  ngOnDestroy() {
    if (this.historySubscription) {
      this.historySubscription.unsubscribe();
    }
  }

  clearHistory() {
    this.timerHistoryService.clearHistory();
    localStorage.removeItem('currentTask');
  }
}