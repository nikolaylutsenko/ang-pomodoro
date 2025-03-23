import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TimerHistoryEntry {
  startTime: Date;
  type: 'work' | 'shortBreak' | 'longBreak';
  isSuccessful: boolean;
  taskDescription?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerHistoryService {
  private history = new BehaviorSubject<TimerHistoryEntry[]>(this.loadHistory());
  private shouldSaveToStorage: boolean = true;

  constructor() {
    // Save history to localStorage when it changes
    this.history.subscribe(history => {
      if (this.shouldSaveToStorage) {
        localStorage.setItem('timerHistory', JSON.stringify(history));
      }
    });
  }

  getHistory(): Observable<TimerHistoryEntry[]> {
    return this.history.asObservable();
  }

  addEntry(entry: TimerHistoryEntry): void {
    const currentHistory = this.history.value;
    this.history.next([entry, ...currentHistory].slice(0, 100)); // Keep only last 100 entries
  }

  clearHistory(): void {
    this.shouldSaveToStorage = false;
    localStorage.removeItem('timerHistory');
    this.history.next([]);
    this.shouldSaveToStorage = true;
  }

  private loadHistory(): TimerHistoryEntry[] {
    const savedHistory = localStorage.getItem('timerHistory');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        // Convert string dates back to Date objects
        return history.map((entry: any) => ({
          ...entry,
          startTime: new Date(entry.startTime)
        }));
      } catch {
        return [];
      }
    }
    return [];
  }
} 