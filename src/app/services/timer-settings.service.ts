import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4
};

@Injectable({
  providedIn: 'root'
})
export class TimerSettingsService {
  private settings = new BehaviorSubject<TimerSettings>(this.loadSettings());

  constructor() {
    // Save settings to localStorage when they change
    this.settings.subscribe(settings => {
      localStorage.setItem('timerSettings', JSON.stringify(settings));
    });
  }

  getSettings(): Observable<TimerSettings> {
    return this.settings.asObservable();
  }

  updateSettings(newSettings: TimerSettings): void {
    this.settings.next(newSettings);
  }

  private loadSettings(): TimerSettings {
    const savedSettings = localStorage.getItem('timerSettings');
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  }
}