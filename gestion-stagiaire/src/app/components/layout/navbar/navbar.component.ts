import { Component, OnInit, Inject, OnDestroy, HostListener,ChangeDetectorRef } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../Auth/auth-service.service';
import { NotificationService } from '../../../services/Notification/notification.service';
import { SignalRService } from '../../../services/SignalRNotif/signal-r.service';
import { Notification, NotificationType, NotificationStatus } from '../../../components/models/Notification';
import { Subscription } from 'rxjs';
import { ToastService } from '../../../services/Toast/toast.service';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  isMenuVisible = false;
  currentUser: any = null;
  
  // Propriétés pour les notifications
  notifications: Notification[] = [];
  unreadCount: number = 0;
  showNotifications: boolean = false;
  hasUnreadNotifications: boolean = false;
  
  // Pour utiliser les enums dans le template
  notificationTypeEnum = NotificationType;
  notificationStatusEnum = NotificationStatus;
  
  private userSubscription: Subscription | null = null;
  private notificationSubscriptions: Subscription[] = [];
  
  // Fermer le menu des notifications quand on clique ailleurs
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Vérifie si le clic est en dehors du menu des notifications
    const notificationElement = document.querySelector('.notification-icon');
    if (notificationElement && !notificationElement.contains(event.target as Node) && this.showNotifications) {
      this.showNotifications = false;
    }
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    private authService: AuthService,
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private toastService : ToastService,
      private cdr: ChangeDetectorRef
  ) {}

ngOnInit(): void {
  console.log('NavbarComponent: Initialisation...');
  
  // S'abonner aux changements d'utilisateur
  this.userSubscription = this.authService.currentUser.subscribe(user => {
    console.log('NavbarComponent: Mise à jour de l\'utilisateur:', user);
    this.currentUser = user;
    
    if (user) {
      console.log('NavbarComponent: Chargement des notifications pour l\'utilisateur:', user.id);
      this.notificationService.loadUnreadCount();
      
      // S'assurer que la connexion SignalR est établie après l'authentification
      setTimeout(() => {
        if (!this.signalRService.isConnected) {
          console.log('NavbarComponent: Démarrage de la connexion SignalR...');
          this.signalRService.startConnection();
        }
      }, 1000);
    }
  });
  
  // S'abonner au compteur de notifications non lues
  this.notificationSubscriptions.push(
    this.notificationService.unreadCount$.subscribe(count => {
      console.log('NavbarComponent: Mise à jour du compteur de notifications:', count);
      this.unreadCount = count;
      this.hasUnreadNotifications = count > 0;
    })
  );
  
  // S'abonner aux nouvelles notifications
  this.notificationSubscriptions.push(
    this.signalRService.newNotification$.subscribe(notification => {
      console.log('NavbarComponent: Nouvelle notification reçue de SignalR:', notification);
      
      if (notification) {
        // Ajouter la nouvelle notification au début de la liste
        this.notifications = [notification, ...this.notifications].slice(0, 5);
        this.hasUnreadNotifications = true;
        
        // Afficher un toast pour la notification
        this.showToast(notification);
      }
    })
  );
}
  private showToast(notification: Notification): void {
  console.log('NavbarComponent: Affichage du toast pour la notification:', notification.title);
  
  // Vérifier si le service ToastService est disponible, sinon utiliser une alerte native
  if (typeof this.toastService !== 'undefined' && this.toastService) {
    this.toastService.show(
      notification.title,
      notification.message,
      this.getToastTypeFromNotification(notification.type),
      5000
    );
  } else {
    // Fallback en utilisant une alerte native
    const message = `${notification.title}: ${notification.message}`;
    console.log('NavbarComponent: Affichage d\'une alerte native:', message);
    setTimeout(() => alert(message), 500);
  }
}
private getToastTypeFromNotification(type: NotificationType): 'success' | 'info' | 'warning' | 'error' {
  try {
    switch (Number(type)) {
      case NotificationType.Success:
        return 'success';
      case NotificationType.Info:
      case NotificationType.Welcome:
      case NotificationType.UserRegistration:
        return 'info';
      case NotificationType.Warning:
        return 'warning';
      case NotificationType.Error:
        return 'error';
      default:
        return 'info';
    }
  } catch (error) {
    console.error('Erreur lors de la conversion du type de notification:', error);
    return 'info';
  }
}
  
  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites de mémoire
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    this.notificationSubscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleMenu(): void {
    this.isMenuVisible = !this.isMenuVisible;
  }
  
  // Méthode pour ouvrir/fermer le menu des notifications
  toggleNotifications(event: Event): void {
    event.stopPropagation(); // Empêcher la propagation pour éviter que le document:click se déclenche
    
    if (!this.showNotifications) {
      // Si on ouvre le menu, charger les notifications
      this.loadNotifications();
    }
    
    this.showNotifications = !this.showNotifications;
  }
  
  // Charger les notifications récentes
  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(notifications => {
      this.notifications = notifications.slice(0, 5); // Limiter à 5 notifications
      this.hasUnreadNotifications = notifications.some(n => n.status === NotificationStatus.Unread);
    });
  }
  
  // Marquer une notification comme lue
  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    
    if (notification.status === NotificationStatus.Unread) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.status = NotificationStatus.Read;
        this.hasUnreadNotifications = this.notifications.some(n => n.status === NotificationStatus.Unread);
      });
    }
  }
  
  // Marquer toutes les notifications comme lues
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(notification => {
        notification.status = NotificationStatus.Read;
      });
      this.hasUnreadNotifications = false;
    });
  }
  
  // Supprimer une notification
  deleteNotification(id: number, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.hasUnreadNotifications = this.notifications.some(n => n.status === NotificationStatus.Unread);
    });
  }
  
  // Obtenir la classe CSS selon le type de notification
  getNotificationTypeClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.Success:
        return 'success';
      case NotificationType.Info:
        return 'info';
      case NotificationType.Warning:
        return 'warning';
      case NotificationType.Error:
        return 'error';
      case NotificationType.UserRegistration:
        return 'user-registration';
      case NotificationType.Welcome:
        return 'welcome';
      default:
        return '';
    }
  }
  
  // Vérifier si l'utilisateur a les permissions d'admin
  hasAdminAccess(): boolean {
    const adminRoles = ['Admin', 'Tuteur', 'RHs'];
    return this.currentUser && adminRoles.includes(this.currentUser.role);
  }
  hasRHAccess(): boolean {
    const adminRoles = [ 'RHs'];
    return this.currentUser && adminRoles.includes(this.currentUser.role);
  }
   
  
  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
  
  // Déconnexion
  logout(): void {
    this.authService.logout();
    this.isMenuVisible = false; // Fermer le menu après déconnexion
  }
}