// src/app/services/SignalRNotif/signal-r.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from '../Notification/notification.service';
import { Notification, NotificationType } from '../../components/models/Notification';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | null = null;
  private connectionIsEstablished = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 secondes
  
  private newNotificationSubject = new BehaviorSubject<Notification | null>(null);
  public newNotification$ = this.newNotificationSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Initialiser la connexion SignalR
  public startConnection(): void {
    if (!this.isBrowser) return;
    
    if (this.hubConnection) {
      console.log('SignalR: La connexion existe déjà');
      return; // Déjà connecté
    }

    console.log('SignalR: Création de la connexion...');
    
    // Créer la connexion avec plus de logs pour le débogage
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/api/notificationHub`, {
        accessTokenFactory: () => {
          const token = localStorage.getItem('auth_token');
          console.log('SignalR: Token récupéré:', token ? 'Présent' : 'Absent');
          return token || '';
        }
      })
      .configureLogging(LogLevel.Information) // Ajouter plus de logs pour le débogage
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            // Calculer le délai exponentiel: 1s, 2s, 4s, 8s, 16s...
            const delay = Math.pow(2, retryContext.previousRetryCount) * 1000;
            console.log(`SignalR: Tentative de reconnexion dans ${delay}ms...`);
            return delay;
          }
          console.log('SignalR: Nombre maximum de tentatives atteint');
          return null; // Arrêter les tentatives
        }
      })
      .build();

    // Gérer les événements de connexion
    this.hubConnection.onreconnecting(error => {
      console.log('SignalR: Reconnexion en cours...', error);
      this.connectionIsEstablished = false;
    });

    this.hubConnection.onreconnected(connectionId => {
      console.log('SignalR: Reconnecté avec ID:', connectionId);
      this.connectionIsEstablished = true;
      this.reconnectAttempts = 0;
    });

    this.hubConnection.onclose(error => {
      console.log('SignalR: Connexion fermée', error);
      this.connectionIsEstablished = false;
      this.tryReconnect();
    });

    // Démarrer la connexion
    this.hubConnection.start()
      .then(() => {
        console.log('SignalR: Connexion établie avec succès!');
        this.connectionIsEstablished = true;
        this.reconnectAttempts = 0;
        this.registerSignalREvents();
      })
      .catch(err => {
        console.error('SignalR: Erreur lors du démarrage de la connexion:', err);
        this.connectionIsEstablished = false;
        this.tryReconnect();
      });
  }

  // Tentative de reconnexion manuelle
  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('SignalR: Nombre maximum de tentatives atteint, abandon.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`SignalR: Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${this.reconnectInterval}ms...`);
    
    setTimeout(() => {
      this.startConnection();
    }, this.reconnectInterval);
  }

  // Arrêter la connexion SignalR
  public stopConnection(): void {
    if (!this.isBrowser || !this.hubConnection) return;

    console.log('SignalR: Arrêt de la connexion...');
    this.hubConnection.stop()
      .then(() => {
        console.log('SignalR: Connexion arrêtée avec succès');
        this.hubConnection = null;
        this.connectionIsEstablished = false;
      })
      .catch(err => console.error('SignalR: Erreur lors de l\'arrêt de la connexion:', err));
  }

  // Enregistrer les événements SignalR
  private registerSignalREvents(): void {
    if (!this.hubConnection) {
      console.error('SignalR: Impossible d\'enregistrer les événements, connexion non établie');
      return;
    }

    console.log('SignalR: Enregistrement des événements...');

    // Tester la connexion
    this.hubConnection.invoke('JoinGroup', 'TestGroup')
      .then(() => console.log('SignalR: Test d\'invocation réussi (JoinGroup)'))
      .catch(err => console.error('SignalR: Erreur lors du test d\'invocation:', err));

    // Écouter l'événement de notification
    this.hubConnection.on('ReceiveNotification', (notification: any) => {
      console.log('SignalR: Notification reçue!', notification);
      
      // S'assurer que la notification est un objet valide
      if (!notification) {
        console.error('SignalR: Notification invalide reçue');
        return;
      }
      
      try {
        // Si c'est une chaîne, essayer de la parser en JSON
        let parsedNotification = notification;
        if (typeof notification === 'string') {
          try {
            parsedNotification = JSON.parse(notification);
          } catch (error) {
            console.warn('SignalR: Impossible de parser la notification comme JSON:', error);
          }
        }
        
        // Mettre à jour le sujet pour les abonnés
        this.newNotificationSubject.next(parsedNotification as Notification);
        
        // Incrémenter le compteur de notifications non lues
        this.notificationService.incrementUnreadCount();
        
        // Forcer le rechargement de la liste des notifications
        this.notificationService.loadUnreadCount();
        
        console.log('SignalR: Notification traitée avec succès');
      } catch (error) {
        console.error('SignalR: Erreur lors du traitement de la notification:', error);
      }
    });

    // Ajouter des gestionnaires d'événements de diagnostic
    this.hubConnection.on('Connected', (message: string) => {
      console.log('SignalR: Événement Connected reçu:', message);
    });

    this.hubConnection.on('UserJoined', (userId: string) => {
      console.log('SignalR: Utilisateur rejoint:', userId);
    });

    this.hubConnection.on('GroupMessage', (groupName: string, message: string) => {
      console.log(`SignalR: Message au groupe ${groupName}:`, message);
    });
  }

  // Méthode pour tester la connexion SignalR
  public testConnection(): void {
    if (!this.hubConnection || !this.connectionIsEstablished) {
      console.error('SignalR: Impossible de tester, connexion non établie');
      return;
    }

    console.log('SignalR: Test de la connexion...');
    this.hubConnection.invoke('SendToGroup', 'TestGroup', 'Test message from client')
      .then(() => console.log('SignalR: Test envoyé avec succès'))
      .catch(err => console.error('SignalR: Erreur lors du test:', err));
  }

  // Getter pour vérifier l'état de la connexion
  public get isConnected(): boolean {
    return this.connectionIsEstablished;
  }

  // Convertir le type de notification en type de toast
  private getToastType(notificationType: NotificationType): 'success' | 'info' | 'warning' | 'error' {
    // Code existant...
    return 'info'; // Valeur par défaut
  }
}