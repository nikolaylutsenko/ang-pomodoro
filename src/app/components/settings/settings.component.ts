import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimerSettingsService, TimerSettings } from '../../services/timer-settings.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-settings',
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatCardModule,
    MatIconModule
  ],
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

  constructor(private settingsService: TimerSettingsService, private taskService: TaskService) {}

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

  downloadTasks() {
    const tasks = this.taskService.getAllTasks(); // Adjust method as per your service
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tasks.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  uploadTasks(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedTasks = JSON.parse(reader.result as string);
        const currentTasks = this.taskService.getAllTasks();
        const newTasks = importedTasks.filter(
          (incoming: any) =>
            !currentTasks.some(
              (existing: any) =>
                existing.id === incoming.id && existing.name === incoming.name
            )
        );
        this.taskService.setAllTasks(importedTasks);
        alert(`Imported successfully! Added ${newTasks.length} new task(s).`);
      } catch (e) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }
}
