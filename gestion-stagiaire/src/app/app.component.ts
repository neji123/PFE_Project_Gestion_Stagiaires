// app.component.ts - Version mise à jour
import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';
import { NavbarComponent } from './components/layout/navbar/navbar.component';
import { FooterComponent } from './components/layout/footer/footer.component';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Router } from '@angular/router';
import { ToastComponent } from './components/Toast/toast/toast.component';
import { SignalRService } from './services/SignalRNotif/signal-r.service';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { AuthService } from './Auth/auth-service.service';
import { isPlatformBrowser } from '@angular/common';

// 🆕 Nouveaux imports pour le système de rapports
import { MigrationService } from './services/Migration/migration.service';
import { ReportTypeService } from './services/Report/ReportType/report-type.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    SidebarComponent,
    ToastComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    NavbarComponent, FooterComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private authSubscription: Subscription | null = null;
  private isBrowser: boolean;
  private isAuthenticated = false;
  title = 'gestion-stagiaire';
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private signalRService: SignalRService,
    private migrationService: MigrationService, // 🆕 Service de migration
    private reportTypeService: ReportTypeService, // 🆕 Service des types de rapports
    @Inject(PLATFORM_ID) private platformId: any
  ) { 
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // N'exécuter que côté client
    if (this.isBrowser) {
      // 🆕 Initialiser les types de rapports au démarrage
      this.initializeReportTypes();
      
      // Vérifier l'état d'authentification et démarrer SignalR si nécessaire
      if (this.authService.isAuthenticated()) {
        setTimeout(() => {
          this.signalRService.startConnection();
        }, 100); // Petit délai pour s'assurer que tout est chargé
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      if (this.authSubscription) {
        this.authSubscription.unsubscribe();
      }
      this.signalRService.stopConnection();
    }
  }

  // 🆕 Initialisation des types de rapports
  private initializeReportTypes(): void {
    console.log('🚀 Initialisation des types de rapports...');
    
    this.migrationService.initializeApp().subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Types de rapports initialisés avec succès');
          
          // Charger les types de rapports pour le cache
          this.reportTypeService.getActiveReportTypes().subscribe({
            next: (reportTypes) => {
              console.log(`📋 ${reportTypes.length} types de rapports chargés:`, 
                reportTypes.map(rt => rt.name));
            },
            error: (error) => {
              console.error('❌ Erreur lors du chargement des types de rapports:', error);
            }
          });
        } else {
          console.warn('⚠️ Initialisation des types de rapports avec des avertissements');
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'initialisation des types de rapports:', error);
        
        // En cas d'erreur, l'application peut continuer à fonctionner
        // mais avec un mode de compatibilité limitée
        console.warn('🔄 Mode de compatibilité activé pour les types de rapports');
      }
    });
  }

  shouldShowHeader(): boolean {
    const hiddenRoutes = ['/dashboard', '/login', '/log'];
    const currentPath = this.router.url.split('?')[0];
    return !hiddenRoutes.includes(currentPath);
  }
}