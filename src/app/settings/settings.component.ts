import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettingsService } from '../services/timer-settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent implements OnInit, OnDestroy {
  settings: any = {};
  private settingsSubscription!: Subscription;

  constructor(private timerSettingsService: TimerSettingsService) {}

  ngOnInit() {
    this.settingsSubscription = this.timerSettingsService.getSettings().subscribe(settings => {
      this.settings = { ...settings };
    });
  }

  ngOnDestroy() {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  saveSettings() {
    this.timerSettingsService.updateSettings(this.settings);
  }
} 