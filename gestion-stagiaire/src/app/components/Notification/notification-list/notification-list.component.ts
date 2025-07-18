// src/app/pages/notifications/notification-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../services/Notification/notification.service';
import { RouterModule } from '@angular/router';
import { Notification, NotificationType, NotificationStatus } from '../../models/Notification';
import { ToastService } from '../../../services/Toast/toast.service';
@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-list.component.html'
})
export class NotificationListComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  activeFilter: 'all' | 'unread' = 'all';
  hasUnread: boolean = false;
  
  // Pour utiliser les enums dans le template
  notificationType = NotificationType;
  notificationStatus = NotificationStatus;

  constructor(private notificationService: NotificationService,private toastService: ToastService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      this.notifications = notifications;
      this.filterNotifications(this.activeFilter);
      this.checkHasUnread();
    });
  }

  filterNotifications(filter: 'all' | 'unread'): void {
    this.activeFilter = filter;
    
    if (filter === 'all') {
      this.filteredNotifications = this.notifications;
    } else {
      this.filteredNotifications = this.notifications.filter(n => n.status === NotificationStatus.Unread);
    }
  }

  markAsRead(id: number): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      // Mettre à jour le statut localement
      const notification = this.notifications.find(n => n.id === id);
      if (notification) {
        notification.status = NotificationStatus.Read;
      }
      
      // Rafraîchir la liste filtrée
      this.filterNotifications(this.activeFilter);
      this.checkHasUnread();
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      // Mettre à jour tous les statuts localement
      this.notifications.forEach(n => {
        n.status = NotificationStatus.Read;
      });
      
      // Rafraîchir la liste filtrée
      this.filterNotifications(this.activeFilter);
      this.checkHasUnread();
    });
  }

  deleteNotification(id: number): void {
    this.notificationService.deleteNotification(id).subscribe(() => {
      // Supprimer de la liste locale
      this.notifications = this.notifications.filter(n => n.id !== id);
      
      // Rafraîchir la liste filtrée
      this.filterNotifications(this.activeFilter);
      this.checkHasUnread();
    });
  }

  getNotificationClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'bg-green-50 border-l-4 border-green-500';
      case NotificationType.Info:
        return 'bg-blue-50 border-l-4 border-blue-500';
      case NotificationType.Warning:
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case NotificationType.Error:
        return 'bg-red-50 border-l-4 border-red-500';
      case NotificationType.UserRegistration:
        return 'bg-purple-50 border-l-4 border-purple-500';
      case NotificationType.Welcome:
        return 'bg-teal-50 border-l-4 border-teal-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  }

  private checkHasUnread(): void {
    this.hasUnread = this.notifications.some(n => n.status === NotificationStatus.Unread);
  }

  testToast(): void {
    console.log('Test toast button clicked');
    this.toastService.show(
      'Test de notification',
      'Ceci est un message de test pour vérifier si les toasts fonctionnent correctement.',
      'info',
      5000
    );
  }
}