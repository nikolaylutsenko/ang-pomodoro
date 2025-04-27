import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettingsService } from '../services/timer-settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settings: any = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4
  };

  constructor(private settingsService: TimerSettingsService) {}

  ngOnInit() {
    this.settingsService.getSettings().subscribe(settings => {
    });
  }

  saveSettings() {
    this.settingsService.updateSettings(this.settings);
  }
}