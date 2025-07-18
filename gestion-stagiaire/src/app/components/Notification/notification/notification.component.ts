// src/app/components/notification/notification.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/Notification/notification.service';
import { SignalRService } from '../../../services/SignalRNotif/signal-r.service';
import { Subscription } from 'rxjs';
import { Notification, NotificationType, NotificationStatus } from '../../models/Notification';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount: number = 0;
  showNotifications: boolean = false;
  private subscriptions: Subscription[] = [];

  // Pour utiliser les enums dans le template
  notificationType = NotificationType;
  notificationStatus = NotificationStatus;

  constructor(
    private notificationService: NotificationService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    // S'abonner au compteur de notifications non lues
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );

    // S'abonner aux nouvelles notifications
    this.subscriptions.push(
      this.signalRService.newNotification$.subscribe(notification => {
        if (notification) {
          // Ajouter la nouvelle notification au début de la liste
          this.notifications = [notification, ...this.notifications];
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites de mémoire
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Charger les notifications
  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      this.notifications = notifications;
      this.showNotifications = true;
    });
  }

  // Basculer l'affichage des notifications
  toggleNotifications(): void {
    if (!this.showNotifications) {
      this.loadNotifications();
    } else {
      this.showNotifications = false;
    }
  }

  // Marquer une notification comme lue
  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation(); // Empêcher la propagation du clic
    if (notification.status === NotificationStatus.Unread) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.status = NotificationStatus.Read;
      });
    }
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(notification => {
        notification.status = NotificationStatus.Read;
      });
    });
  }

  // Supprimer une notification
  deleteNotification(id: number, event: Event): void {
    event.stopPropagation(); // Empêcher la propagation du clic
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
    });
  }

  // Obtenir la classe CSS en fonction du type de notification
  getNotificationClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'bg-green-100 border-green-500';
      case NotificationType.Info:
        return 'bg-blue-100 border-blue-500';
      case NotificationType.Warning:
        return 'bg-yellow-100 border-yellow-500';
      case NotificationType.Error:
        return 'bg-red-100 border-red-500';
      case NotificationType.UserRegistration:
        return 'bg-purple-100 border-purple-500';
      case NotificationType.Welcome:
        return 'bg-teal-100 border-teal-500';
      default:
        return 'bg-gray-100 border-gray-500';
    }
  }

  // Obtenir l'icône en fonction du type de notification
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'check-circle';
      case NotificationType.Info:
        return 'info';
      case NotificationType.Warning:
        return 'alert-triangle';
      case NotificationType.Error:
        return 'alert-octagon';
      case NotificationType.UserRegistration:
        return 'user-plus';
      case NotificationType.Welcome:
        return 'smile';
      default:
        return 'bell';
    }
  }
}