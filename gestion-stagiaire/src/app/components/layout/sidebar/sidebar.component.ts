import { Component, EventEmitter, Input, OnInit, Output, PLATFORM_ID, Inject, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// Importation des modules Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatIconModule, 
    MatTooltipModule, 
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isVisible: boolean = false;
  @Output() visibilityChange = new EventEmitter<boolean>();
  @ViewChild('sidebarRef', { static: false }) sidebarRef!: ElementRef;
  
  // Propriétés utilisateur
  currentUser: any = null;
  userProfileImage: string = 'assets/images/default-profile.jpg';
  username: string = 'Utilisateur';
  
  // Thème sombre - on vérifie les préférences de l'utilisateur
  isDarkMode: boolean = false;
  
  // État de la souris
  isMouseOverSidebar = false;
  isMouseOverHoverZone = false;
  
  // Pour gérer la visibilité du footer
  isFooterVisible: boolean = false;
  
  // Souscriptions
  private userSubscription: Subscription | null = null;
  private mouseLeaveSubscription: Subscription | null = null;
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private elementRef: ElementRef
  ) {}
  
  // Écouter l'événement de défilement pour détecter quand le footer est visible
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkFooterVisibility();
    }
  }
  
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Vérifier la préférence de thème sombre
      this.checkDarkModePreference();
      
      // Réagir aux changements de taille d'écran
      this.checkScreenSize();
      window.addEventListener('resize', this.checkScreenSize.bind(this));
      
      // Récupérer les infos utilisateur
      this.checkLocalStorageForUser();
      
      // Configurer les écouteurs d'événements pour la souris
      this.setupMouseListeners();
      
      // Vérifier la visibilité du footer
      this.checkFooterVisibility();
    }
  }
  
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    
    if (this.mouseLeaveSubscription) {
      this.mouseLeaveSubscription.unsubscribe();
    }
    
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.checkScreenSize.bind(this));
    }
  }
  
  // Nouvelle méthode pour vérifier si le footer est visible
  private checkFooterVisibility(): void {
    const footer = document.querySelector('footer');
    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Si le haut du footer est visible dans la fenêtre
      this.isFooterVisible = footerRect.top < windowHeight;
      
      // Ajuster la hauteur de la sidebar si le footer est visible
      if (this.isFooterVisible && this.sidebarRef) {
        const sidebarEl = this.sidebarRef.nativeElement;
        const footerTop = footerRect.top;
        const headerHeight = 80; // même valeur que dans le CSS
        
        // Ajuster la hauteur max de la sidebar pour s'arrêter au-dessus du footer
        sidebarEl.style.maxHeight = `${footerTop - headerHeight}px`;
      } else if (this.sidebarRef) {
        // Restaurer la hauteur par défaut
        this.sidebarRef.nativeElement.style.maxHeight = `calc(100vh - 80px)`;
      }
    }
  }
  
  // Configure les écouteurs d'événements de souris
  private setupMouseListeners(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Après un délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        // Écouter les événements mousemove sur tout le document
        fromEvent(document, 'mousemove')
          .pipe(debounceTime(50)) // Limiter le taux d'appels
          .subscribe((event: any) => {
            // Détecter si la souris est sur la zone de survol ou sur la sidebar
            const mouseX = event.clientX;
            const mouseY = event.clientY;
            
            // Zone de survol = bord gauche (10px)
            this.isMouseOverHoverZone = mouseX <= 10;
            
            // Vérifier si la souris est sur la sidebar
            if (this.sidebarRef && this.isVisible) {
              const sidebarRect = this.sidebarRef.nativeElement.getBoundingClientRect();
              this.isMouseOverSidebar = (
                mouseX >= sidebarRect.left && 
                mouseX <= sidebarRect.right && 
                mouseY >= sidebarRect.top && 
                mouseY <= sidebarRect.bottom
              );
            }
            
            // Afficher la sidebar si la souris est sur la zone de survol
            if (this.isMouseOverHoverZone && !this.isVisible) {
              this.showSidebar();
            }
            
            // Masquer la sidebar si elle est visible et que la souris n'est ni sur la zone de survol ni sur la sidebar
            if (this.isVisible && !this.isMouseOverHoverZone && !this.isMouseOverSidebar) {
              // Ajouter un délai pour éviter une disparition trop rapide
              setTimeout(() => {
                // Vérifier à nouveau avant de masquer
                if (!this.isMouseOverSidebar && !this.isMouseOverHoverZone) {
                  this.hideSidebar();
                }
              }, 300);
            }
          });
      }, 500);
    }
  }
  
  // Méthode pour vérifier la préférence de thème sombre
  private checkDarkModePreference(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Vérifier localStorage d'abord
      const storedPreference = localStorage.getItem('darkMode');
      if (storedPreference) {
        this.isDarkMode = storedPreference === 'true';
      } else {
        // Mode clair par défaut
        this.isDarkMode = false;
      }
      
      // Appliquer le thème
      this.applyTheme();
    }
  }
  
  // Méthode pour basculer entre les thèmes clair et sombre
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('darkMode', this.isDarkMode.toString());
      this.applyTheme();
    }
    
    // Afficher une notification
    this.snackBar.open(
      `Mode ${this.isDarkMode ? 'sombre' : 'clair'} activé`, 
      'OK', 
      { duration: 2000 }
    );
  }
  
  // Appliquer le thème à tout le document
  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.isDarkMode) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }
  
  // Méthode pour montrer la sidebar
  showSidebar(): void {
    if (!this.isVisible) {
      this.isVisible = true;
      this.visibilityChange.emit(this.isVisible);
      
      // Vérifier si le footer est visible après avoir montré la sidebar
      setTimeout(() => {
        this.checkFooterVisibility();
      }, 100);
    }
  }
  
  // Méthode pour cacher la sidebar
  hideSidebar(): void {
    if (this.isVisible) {
      this.isVisible = false;
      this.visibilityChange.emit(this.isVisible);
    }
  }
  
  // Basculer manuellement l'état de la sidebar
  toggleSidebar(): void {
    this.isVisible = !this.isVisible;
    this.visibilityChange.emit(this.isVisible);
    
    // Vérifier à nouveau la visibilité du footer
    if (this.isVisible) {
      setTimeout(() => {
        this.checkFooterVisibility();
      }, 100);
    }
  }
  
  // Naviguer vers la page de profil
  navigateToProfile(): void {
    if (this.currentUser?.id) {
      this.router.navigate(['/profile']);
    }
  }
  
  // Méthode pour gérer les événements mouseenter et mouseleave
  onSidebarMouseEnter(): void {
    this.isMouseOverSidebar = true;
  }
  
  onSidebarMouseLeave(): void {
    this.isMouseOverSidebar = false;
    
    // Petit délai avant de vérifier à nouveau et masquer si nécessaire
    setTimeout(() => {
      if (!this.isMouseOverSidebar && !this.isMouseOverHoverZone) {
        this.hideSidebar();
      }
    }, 300);
  }
  
  // Méthode de déconnexion - améliorée pour une meilleure UX
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Afficher une notification de confirmation
      this.snackBar.open('Déconnexion en cours...', '', {
        duration: 1000
      });
      
      // Petit délai pour montrer la notification avant de se déconnecter
      setTimeout(() => {
        // Supprimer le token et les infos utilisateur
        localStorage.removeItem('auth_token');
        localStorage.removeItem('currentUser');
        
        // Rediriger vers la page de connexion
        this.router.navigate(['/login']);
      }, 1000);
    }
  }
  
  // Vérifier l'accès administrateur
  hasAdminAccess(): boolean {
    const adminRoles = ['Admin', 'Tuteur', 'RHs'];
    return this.currentUser && adminRoles.includes(this.currentUser.role);
  }
   hasRHAccess(): boolean {
    const adminRoles = [ 'RHs'];
    return this.currentUser && adminRoles.includes(this.currentUser.role);
  }
  
  private checkScreenSize(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Sur mobile, on cache automatiquement le sidebar
      if (window.innerWidth <= 768 && this.isVisible) {
        this.isVisible = false;
        this.visibilityChange.emit(this.isVisible);
      }
    }
  }
  
  private checkLocalStorageForUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedUserString = localStorage.getItem('currentUser');
      
      if (storedUserString && storedUserString !== 'undefined' && storedUserString !== 'null') {
        try {
          const storedUser = JSON.parse(storedUserString);
          this.handleUserData(storedUser);
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
          this.generateInitialsImage('User');
        }
      } else {
        this.fetchUserInfoFromToken();
      }
    }
  }
  
  private fetchUserInfoFromToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Mettre à jour le nom d'utilisateur avec une des valeurs disponibles
            if (payload.unique_name) {
              this.username = payload.unique_name;
            } else if (payload.name) {
              this.username = payload.name;
            } else if (payload.email) {
              this.username = payload.email.split('@')[0];
            }
            
            // Mettre à jour this.currentUser avec les informations du token
            this.currentUser = {
              id: payload.nameid,
              username: payload.unique_name || payload.name || payload.email.split('@')[0],
              role: payload.role
            };
            
            // Si le token contient un ID utilisateur, essayer de récupérer plus d'informations
            if (payload.nameid) {
              this.tryGetProfileImage(payload.nameid, token);
            } else {
              this.generateInitialsImage(this.username);
            }
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          this.generateInitialsImage('User');
        }
      }
    }
  }
  
  private handleUserData(user: any): void {
    this.currentUser = user;
    
    // Déterminer le nom à afficher
    if (user.firstName && user.lastName) {
      this.username = `${user.firstName} ${user.lastName}`;
    } else if (user.username) {
      this.username = user.username;
    } else if (user.email) {
      this.username = user.email.split('@')[0];
    } else {
      this.username = 'Utilisateur';
    }
    
    // Gérer l'image de profil
    if (user.profilePictureUrl) {
      // Vérifier si l'URL commence par http:// ou https://
      if (user.profilePictureUrl.startsWith('http')) {
        this.userProfileImage = user.profilePictureUrl;
      } else {
        // Si c'est un chemin relatif, ajuster l'URL
        this.userProfileImage = `${environment.apiUrl}/${user.profilePictureUrl.replace(/^\//, '')}`;
      }
    } else if (user.id) {
      // Essayer de récupérer l'image de profil par ID
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.tryGetProfileImage(user.id, token);
      } else {
        this.generateInitialsImage(this.username);
      }
    } else {
      // Générer une image avec les initiales
      this.generateInitialsImage(this.username);
    }
  }
  private generateInitialsImage(name: string): void {
    if (!name) name = 'User';
    
    // Obtenir les initiales (première lettre du prénom et du nom)
    const parts = name.split(' ');
    let initials = parts[0].charAt(0).toUpperCase();
    if (parts.length > 1) {
      initials += parts[parts.length - 1].charAt(0).toUpperCase();
    }
    
    // Générer une couleur basée sur le nom
    const hue = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);
    const bgColor = `hsl(${hue}, 70%, 60%)`;
    
    try {
      // Créer un SVG
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="${bgColor}"/>
          <text x="50" y="50" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">
            ${initials}
          </text>
        </svg>
      `;
      
      // Convertir le SVG en base64 pour l'URL de l'image
      this.userProfileImage = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    } catch (error) {
      console.error('Error generating initials image:', error);
      // Fallback pour les navigateurs qui ne supportent pas btoa pour les caractères Unicode
      this.userProfileImage = 'assets/images/default-profile.jpg';
    }
  }
  
  private tryGetProfileImage(userId: string, token: string): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    // Essayer de récupérer le profil utilisateur par ID
    this.http.get(`${environment.apiUrl}/api/Users/${userId}`, { headers })
      .subscribe({
        next: (user: any) => {
          if (user && user.profilePictureUrl) {
            // Vérifier si l'URL commence par http:// ou https://
            if (user.profilePictureUrl.startsWith('http')) {
              this.userProfileImage = user.profilePictureUrl;
            } else {
              // Si c'est un chemin relatif, ajuster l'URL
              this.userProfileImage = `${environment.apiUrl}/${user.profilePictureUrl.replace(/^\//, '')}`;
            }
          } else {
            // Générer une image avec les initiales
            this.generateInitialsImage(user.firstName || user.username || 'User');
          }
        },
        error: (error) => {
          console.warn('Error fetching user profile by ID:', error);
          // Générer une image avec les initiales en cas d'erreur
          this.generateInitialsImage(this.username);
        }
      });
  }

  navigateToDashboard(): void {
  const userRole = this.currentUser?.role;
  
  switch (userRole) {
    case 'Tuteur':
      this.router.navigate(['/tuteur-dashboard']);
      break;
    case 'Stagiaire':
      this.router.navigate(['/Stagiaire-dashboard']);
      break;
    case 'RHs':
      this.router.navigate(['/RH-dashboard']);
      break;
    case 'Admin':
      this.router.navigate(['/admin-dashboard']);
      break;
    default:
      // Fallback vers la route par défaut
      this.router.navigate(['/dashboard']);
      break;
  }
}

isDashboardActive(): boolean {
  const currentUrl = this.router.url;
  const userRole = this.currentUser?.role;
  
  switch (userRole) {
    case 'Tuteur':
      return currentUrl === '/tuteur-dashboard';
    case 'Stagiaire':
      return currentUrl === '/Stagiaire-dashboard';
    case 'RHs':
      return currentUrl === '/RH-dashboard';
    case 'Admin':
      return currentUrl === '/admin-dashboard';
    default:
      return currentUrl === '/dashboard' || currentUrl === '/';
  }
}
}