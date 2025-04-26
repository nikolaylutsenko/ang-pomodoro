import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {
  tabs = [
    { path: '/timer', label: 'Timer', icon: 'fa-clock' },
    { path: '/statistics', label: 'Statistics', icon: 'fa-chart-bar' },
    { path: '/settings', label: 'Settings', icon: 'fa-cog' }
  ];
}
