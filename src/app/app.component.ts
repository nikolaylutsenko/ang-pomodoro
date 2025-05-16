import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';
import packageJson from '../../package.json'; // Import package.json
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavComponent, MatTabsModule, MatToolbarModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Pomodoro';
  isDarkModeActive = false; // Single property for theme state, default to false (light)
  version: string = packageJson.version;


  ngOnInit() {
    // asks for permission to show notifications
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // console.log('Notification permission granted.'); // REMOVED
        } else {
          // console.log('Notification permission denied.'); // REMOVED
        }
      });
    }

    // Check if there's a saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkModeActive = savedTheme === 'dark';
    } // If no savedTheme, isDarkModeActive remains its default (false for light)
    this.applyTheme(); // Apply initial theme
  }

  toggleTheme() {
    this.isDarkModeActive = !this.isDarkModeActive;
    localStorage.setItem('theme', this.isDarkModeActive ? 'dark' : 'light');
    this.applyTheme();
  }
  private applyTheme() {
    if (this.isDarkModeActive) {
      document.body.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.removeAttribute('data-theme');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
    // This will trigger a reflow and ensure all CSS variables are properly updated
    document.body.classList.add('theme-transition');
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 300);
  }
}
