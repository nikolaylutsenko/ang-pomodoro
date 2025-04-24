import { Injectable } from '@angular/core';

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor() {}

  async showNotification(title: string, options?: NotificationOptions & { actions?: NotificationAction[] }): Promise<Notification | null> {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notification');
      return null;
    }

    if (Notification.permission === 'granted') {
      // Use Service Worker registration to show notification which supports actions
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        // Note: We don't get a Notification object back directly here to attach listeners
        // Event handling for actions is done in the service worker (service-worker.js)
        console.log('Notification shown via Service Worker.');
        return null; // Return null as we don't manage the Notification object directly
      } catch (err) {
        console.error('Service Worker notification error:', err);
        // Fallback or alternative handling if needed
        return null;
      }
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Retry showing notification via Service Worker after permission granted
        return this.showNotification(title, options);
      } else {
        console.log('Notification permission denied.');
        return null;
      }
    } else {
      console.log('Notification permission is denied.');
      return null;
    }
  }
}