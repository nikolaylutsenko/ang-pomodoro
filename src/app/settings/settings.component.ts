import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettingsService, TimerSettings } from '../services/timer-settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settings: TimerSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4
  };

  constructor(private settingsService: TimerSettingsService) {}

  ngOnInit() {
    this.settingsService.getSettings().subscribe(saved => {
      this.settings = { ...saved };
    });
  }

  saveSettings() {
    // Ensure values are numbers before updating
    const newSettings: TimerSettings = {
      workDuration: Number(this.settings.workDuration),
      shortBreakDuration: Number(this.settings.shortBreakDuration),
      longBreakDuration: Number(this.settings.longBreakDuration),
      longBreakInterval: Number(this.settings.longBreakInterval)
    };
    this.settingsService.updateSettings(newSettings);
  }
}