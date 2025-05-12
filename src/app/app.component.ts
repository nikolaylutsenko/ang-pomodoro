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
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkModeActive = !this.isDarkModeActive;
    localStorage.setItem('theme', this.isDarkModeActive ? 'dark' : 'light');
    this.applyTheme();
  }
  private applyTheme() {
    if (this.isDarkModeActive) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
    // This will trigger a reflow and ensure all CSS variables are properly updated
    document.body.classList.add('theme-transition');
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 300);
  }
}
