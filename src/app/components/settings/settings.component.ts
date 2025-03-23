import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettings, TimerSettingsService } from '../../services/timer-settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  settings: TimerSettings;

  constructor(private timerSettingsService: TimerSettingsService) {
    this.settings = {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4
    };
  }

  ngOnInit(): void {
    this.timerSettingsService.getSettings().subscribe(settings => {
      this.settings = { ...settings };
    });
  }

  updateSettings(): void {
    this.timerSettingsService.updateSettings(this.settings);
  }
}
