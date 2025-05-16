import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, MatTabsModule, MatIconModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {


  tabs = [
    { path: '/timer', label: 'Timer', icon: 'fa-clock' },
    { path: '/tasks', label: 'Tasks', icon: 'fa-tasks' },
    { path: '/statistics', label: 'Statistics', icon: 'fa-chart-bar' },
    { path: '/settings', label: 'Settings', icon: 'fa-cog' }
  ];

  constructor(private router: Router) {} // Inject Router

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); // Prevent default browser behavior (scrolling)
      const currentPath = this.router.url;
      const currentIndex = this.tabs.findIndex(tab => tab.path === currentPath);

      let nextIndex;
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % this.tabs.length;
      } else { // ArrowLeft
        nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
      }
      this.router.navigateByUrl(this.tabs[nextIndex].path);
    }
  }
}
