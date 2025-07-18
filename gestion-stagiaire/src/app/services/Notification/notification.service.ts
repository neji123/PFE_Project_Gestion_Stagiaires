// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Notification, NotificationType, NotificationStatus, CreateNotificationDto } from '../../components/models/Notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notification`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUnreadCount();
  }

   resetUnreadCount(): void {
    this.unreadCountSubject.next(0);
  }
  // Charger le nombre de notifications non lues
 loadUnreadCount(): void {
    this.http.get<number>(`${this.apiUrl}/unread/count`)
      .subscribe({
        next: (count) => {
          console.log('Nombre de notifications non lues chargé:', count);
          this.unreadCountSubject.next(count);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des notifications non lues:', error);
          // En cas d'erreur, réinitialiser le compteur
          this.unreadCountSubject.next(0);
        }
      });
  }

  // Incrémenter le compteur de notifications non lues
  incrementUnreadCount(): void {
  console.log('Incrémentation du compteur de notifications non lues');
  const currentCount = this.unreadCountSubject.value;
  const newCount = currentCount + 1;
  console.log(`Compteur avant: ${currentCount}, après: ${newCount}`);
  this.unreadCountSubject.next(newCount);
}
refreshUnreadCount(): void {
  console.log('Rafraîchissement forcé du compteur de notifications non lues');
  this.http.get<number>(`${this.apiUrl}/unread/count`)
    .subscribe({
      next: (count) => {
        console.log('Nouveau compteur récupéré:', count);
        this.unreadCountSubject.next(count);
      },
      error: (error) => {
        console.error('Erreur lors du rafraîchissement du compteur:', error);
      }
    });
}

  // Obtenir toutes les notifications de l'utilisateur
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  // Obtenir uniquement les notifications non lues
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`);
  }

  // Obtenir le nombre de notifications non lues
  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread/count`);
  }

  // Obtenir une notification spécifique
  getNotification(id: number): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`);
  }

  // Marquer une notification comme lue
  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const currentCount = this.unreadCountSubject.value;
        if (currentCount > 0) {
          this.unreadCountSubject.next(currentCount - 1);
        }
      })
    );
  }

  // Marquer toutes les notifications comme lues
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCountSubject.next(0);
      })
    );
  }

  // Supprimer une notification
  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Créer une notification (pour les admins/RHs)
  createNotification(notification: CreateNotificationDto): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  // Méthode utilitaire pour convertir enum en string (pour l'affichage)
  getNotificationTypeString(type: NotificationType): string {
    return NotificationType[type];
  }

  getNotificationStatusString(status: NotificationStatus): string {
    return NotificationStatus[status];
  }
}