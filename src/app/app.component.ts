import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerComponent } from './timer/timer.component';
import { SettingsComponent } from './settings/settings.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TimerComponent, SettingsComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Pomodoro';
  isLightTheme = false;
  isDarkTheme = true;
  isSettingsOpen = false;

  ngOnInit() {
    // asks for permission to show notifications
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
        } else {
          console.log('Notification permission denied.');
        }
      });
    }

    // Check if there's a saved theme preference
    const savedTheme = localStorage.getItem('theme');
    this.isLightTheme = savedTheme === 'light';
    this.isDarkTheme = savedTheme === 'dark';
    this.updateThemeClass();
  }

  toggleTheme() {
    this.isLightTheme = !this.isLightTheme;
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isLightTheme ? 'light' : 'dark');
    this.updateThemeClass();
  }

  toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen;
  }

  private updateThemeClass() {
    if (this.isLightTheme) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }
}
