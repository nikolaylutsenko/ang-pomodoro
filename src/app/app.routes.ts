import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'timer', loadComponent: () => import('./timer/timer.component').then(m => m.TimerComponent) },
  { path: 'statistics', loadComponent: () => import('./components/statistics/statistics.component').then(m => m.StatisticsComponent) },
  { path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: '', redirectTo: 'timer', pathMatch: 'full' },
  { path: '**', redirectTo: 'timer' }
];
