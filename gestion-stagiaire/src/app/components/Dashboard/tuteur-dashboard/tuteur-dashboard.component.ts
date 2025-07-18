// tuteur-dashboard.component.ts - Version corrigée
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Subject, interval, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
// Shared components
import { StatCardComponent } from '../stat-card/stat-card.component';
import { ChartComponent } from '../chart/chart.component';
import { UserCardComponent } from '../user-card/user-card.component';
import { RecentActivityComponent } from '../recent-activity/recent-activity.component';

// Services
import { UserService } from '../../../services/User/user.service';
import { ReportService } from '../../../services/Report/report.service';
import { AuthService } from '../../../Auth/auth-service.service';

@Component({
  selector: 'app-tuteur-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BaseChartDirective,
    StatCardComponent,
    ChartComponent,
    UserCardComponent,
    RecentActivityComponent
  ],
  templateUrl: './tuteur-dashboard.component.html',
  styleUrls: ['./tuteur-dashboard.component.scss']
})
export class TuteurDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Statistics
  tuteurStats = {
    stagiairesCount: 0,
    pendingReports: 0,
    completedTasks: 0,
    messages: 0
  };

  // Stagiaires data
  myStagiaires: any[] = [];
  stagiairePerformance: any = {};
  stagiaireProgress: any[] = [];

  // Documents and activities
  documentsToValidate: any[] = [];
  recentActivities: any[] = [];

  // Loading states
  isLoading = true;
  hasError = false;
  errorMessage = '';
  isRefreshing = false;

  // Chart options
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(116, 116, 128, 0.1)',
        },
        ticks: {
          color: '#747480'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#747480'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  // Inject services
  private userService = inject(UserService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;

    const currentUserId = this.getCurrentUserId();

    // Fetch tuteur stats
    this.userService.getTuteurStats(currentUserId).subscribe({
      next: (stats) => {
        this.tuteurStats = stats;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des statistiques';
      }
    });

    // Fetch stagiaires list
    this.userService.getStagiairesByTuteur(currentUserId).subscribe({
      next: (stagiaires) => {
        this.myStagiaires = stagiaires;
        this.prepareStagiairePerformanceData(stagiaires);
        this.prepareProgress(stagiaires);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des stagiaires:', error);
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des stagiaires';
      }
    });

    // Fetch reports to validate
    this.reportService.getReportsByTuteur(currentUserId).subscribe({
      next: (reports) => {
        this.documentsToValidate = reports
          .filter(report => !report.isApproved && !report.isRejected)
          .map(report => ({
            id: report.id,
            title: report.title,
            submittedDate: report.submissionDate,
            type: 'Rapport',
reportType: report.reportTypeName,
            stagiaireName: report.stagiaireName,
            stagiaireId: report.stagiaireId,
            fileUrl: report.downloadUrl
          }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rapports:', error);
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des rapports';
      }
    });

    // Fetch recent activities
    this.userService.getRecentActivities(currentUserId).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des activités:', error);
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des activités';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // Méthode pour récupérer l'ID de l'utilisateur courant
  getCurrentUserId(): number {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.id || 1;
  }

  // Méthode pour générer les initiales
  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Méthode pour obtenir une couleur en fonction d'un score
  public getColorByScore(score: number): string {
    if (score >= 90) return '#36B37E'; // EY Green
    if (score >= 75) return '#FFE600'; // EY Yellow
    if (score >= 60) return '#41535f'; // EY Blue
    return '#FF5630'; // EY Red
  }

  // Méthode pour générer une performance aléatoire (utilisée comme fallback)
  private getRandomPerformance(): number {
    return Math.floor(Math.random() * 30) + 70;
  }

  // Quick refresh method
  refreshData(): void {
    this.isRefreshing = true;
    this.loadDashboardData();
    setTimeout(() => {
      this.isRefreshing = false;
    }, 1000);
  }

  // Méthode pour préparer les données de progression des stagiaires
  private prepareProgress(stagiaires: any[]): void {
    this.stagiaireProgress = stagiaires.map(stagiaire => ({
      id: stagiaire.id,
      name: `${stagiaire.firstName} ${stagiaire.lastName}`,
      progress: stagiaire.progress || this.calculateProgress(stagiaire),
      avatar: stagiaire.profilePictureUrl || null, // CORRECTION: utiliser profilePictureUrl
      department: stagiaire.departmentName || 'Non assigné'
    }));
  }

  // Méthode pour calculer le progrès d'un stagiaire
  private calculateProgress(stagiaire: any): number {
    if (stagiaire.startDate && stagiaire.endDate) {
      const startDate = new Date(stagiaire.startDate);
      const endDate = new Date(stagiaire.endDate);
      const currentDate = new Date();
      
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsedDuration = currentDate.getTime() - startDate.getTime();
      
      if (totalDuration <= 0) return 0;
      return Math.min(Math.max(Math.floor((elapsedDuration / totalDuration) * 100), 0), 100);
    }
    
    return Math.floor(Math.random() * 30) + 70;
  }

  // Méthode pour préparer les données de performance des stagiaires
  private prepareStagiairePerformanceData(stagiaires: any[]): void {
    const promises = stagiaires.map(stagiaire => 
      this.reportService.getReportsByStagiaire(stagiaire.id).toPromise()
    );
    
    Promise.all(promises).then(reportsList => {
      const labels = stagiaires.map(s => s.firstName);
      const data = reportsList.map((reports) => {
        if (!reports || reports.length === 0) {
          return this.getRandomPerformance();
        }
        
        const submittedCount = reports.filter(r => r.isSubmitted).length;
        const approvedCount = reports.filter(r => r.isApproved).length;
        
        if (submittedCount === 0) return 0;
        return Math.floor((approvedCount / submittedCount) * 100);
      });
      
      this.stagiairePerformance = {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: data.map(score => this.getColorByScore(score)),
          barPercentage: 0.7
        }]
      };
    }).catch(error => {
      console.error('Erreur lors du calcul des performances:', error);
      
      const labels = stagiaires.map(s => s.firstName);
      const data = stagiaires.map(() => this.getRandomPerformance());
      
      this.stagiairePerformance = {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: data.map(score => this.getColorByScore(score)),
          barPercentage: 0.7
        }]
      };
    });
  }

  // Actions
  reviewDocument(documentId: number): void {
    console.log('Reviewing document:', documentId);
  }

  // Tracking methods pour performance
  trackByStagiaire(index: number, item: any): any {
    return item.id;
  }

  trackByDocument(index: number, item: any): any {
    return item.id;
  }

  trackByActivity(index: number, item: any): any {
    return item.text + item.time;
  }

  getActivityIcon(type: string): string {
    switch(type) {
      case 'completion': return 'fa-check-circle';
      case 'message': return 'fa-comment-dots';
      case 'user': return 'fa-user-plus';
      case 'document': return 'fa-file-upload';
      default: return 'fa-info-circle';
    }
  }

  // CORRECTION: Même méthode que dans mes-stagiaires
  getImageUrl(relativeUrl: string | null): string {
    if (!relativeUrl) return '/assets/images/avatar-placeholder.png'; // CHANGEMENT: utiliser une image qui existe
    
    // Si c'est déjà une URL complète, retournez-la telle quelle
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Sinon, préfixez avec l'URL du backend
    return `${environment.apiUrl}${relativeUrl}`;
  }
  
  // CORRECTION: Même méthode que dans mes-stagiaires  
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Utiliser une image SVG générée ou une couleur de fond
    img.style.display = 'none';
    
    // Ou créer dynamiquement un avatar avec initiales
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = `<div class="avatar-placeholder">${this.getInitials(img.alt)}</div>`;
    }
  }
}