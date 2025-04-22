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

showNotification(title: string, options?: NotificationOptions): Promise<Notification> {
  return new Promise((resolve, reject) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, options);
      resolve(notification);
    } else {
      reject('Notification permission not granted');
    }
  });
}
}