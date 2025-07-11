import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TimerHistoryService, TimerHistoryEntry } from '../../services/timer-history.service';

// -- IMPORT ANGULAR MATERIAL MODULES --
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list'; // For a list-based display
import { MatDividerModule } from '@angular/material/divider';
// -- END IMPORT ANGULAR MATERIAL MODULES --

@Component({
  selector: 'app-timer-history',
  standalone: true,
  imports: [
    CommonModule,
    // -- ADD ANGULAR MATERIAL MODULES --
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
    // -- END ADD ANGULAR MATERIAL MODULES --
  ],
  templateUrl: './timer-history.component.html',
  styleUrl: './timer-history.component.scss'
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
