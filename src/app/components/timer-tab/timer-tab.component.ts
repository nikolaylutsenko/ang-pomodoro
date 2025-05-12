import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimerComponent } from '../timer/timer.component';
import { TimerHistoryComponent } from '../timer-history/timer-history.component';

@Component({
  selector: 'app-timer-tab',
  standalone: true,
  imports: [CommonModule, TimerComponent, TimerHistoryComponent],
  templateUrl: './timer-tab.component.html',
  styleUrl: './timer-tab.component.scss'
})
export class TimerTabComponent {
  // TimerTabComponent is just a container that includes both
  // TimerComponent and TimerHistoryComponent
}
