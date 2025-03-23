import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app.component';
import { TimerComponent } from './timer/timer.component';
import { SettingsComponent } from './settings/settings.component';
import { TimerSettingsService } from './services/timer-settings.service';

@NgModule({
  declarations: [
    AppComponent,
    TimerComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule
  ],
  providers: [TimerSettingsService],
  bootstrap: [AppComponent]
})
export class AppModule { } 