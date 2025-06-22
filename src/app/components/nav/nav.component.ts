import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, MatTabsModule, MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {


  tabs = [
    { path: '/timer', label: 'Timer', icon: 'timer' },
    { path: '/tasks', label: 'Tasks', icon: 'assignment' },
    { path: '/statistics', label: 'Statistics', icon: 'bar_chart' },
    { path: '/settings', label: 'Settings', icon: 'settings' }
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
