import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TimerSettingsService } from './app/services/timer-settings.service';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    TimerSettingsService,
    importProvidersFrom(FormsModule)
  ]
}).catch(err => console.error(err));
