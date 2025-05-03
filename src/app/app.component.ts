import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';
import packageJson from '../../package.json'; // Import package.json

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Pomodoro';
  isLightTheme = false;
  isDarkTheme = true;
  version: string = packageJson.version; // Add version property


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

  private updateThemeClass() {
    if (this.isDarkTheme) {
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.remove('light-theme');
    } else {
      document.body.removeAttribute('data-theme');
      document.body.classList.add('light-theme');
    }
  }
}
