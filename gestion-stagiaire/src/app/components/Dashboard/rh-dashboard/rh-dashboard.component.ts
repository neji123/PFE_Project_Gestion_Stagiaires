// rh-dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { catchError, finalize, forkJoin, of } from 'rxjs';

// Shared components
import { StatCardComponent } from '../stat-card/stat-card.component';
import { ChartComponent } from '../chart/chart.component';
import { UserCardComponent } from '../user-card/user-card.component';
import { RecentActivityComponent } from '../recent-activity/recent-activity.component';

// Services
import { UserService } from '../../../services/User/user.service';
import { ReportService } from '../../../services/Report/report.service';
import { StatisticsService } from '../../../services/Dashboard/statistics.service';
import { AuthService } from '../../../Auth/auth-service.service';

@Component({
  selector: 'app-rh-dashboard',
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
  templateUrl: './rh-dashboard.component.html',
  styleUrls: ['./rh-dashboard.component.scss']
})
export class RhDashboardComponent implements OnInit {
  // Statistiques globales
  rhStats = {
    activeStages: 0,
    activeTuteurs: 0,
    pendingAccounts: 0,
    validatedDocuments: 0
  };

  // KPIs avancés
  rhKPIs: any = {};

  // Données pour les graphiques
  departmentDistribution: any = {};
  stageTypeDistribution: any = {};
  educationLevelDistribution: any = {};
  universityDistribution: any = {};
  monthlyStageDistribution: any = {};
  
  // Données pour les tableaux
  pendingAccounts: any[] = [];
  recentlyStagiaires: any[] = [];
  endingSoonStagiaires: any[] = [];
  
  // Activités récentes
  recentActivities: any[] = [];

  // États de chargement
  isLoading = true;
  hasError = false;
  errorMessage = '';

  // Options pour les graphiques
  pieChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right'
      }
    }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: { 
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Nombre de stagiaires'
        }
      }
    }
  };

  // Services injectés
  private userService = inject(UserService);
  private reportService = inject(ReportService);
  private statisticsService = inject(StatisticsService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;

    // Chargement des statistiques de base
    this.loadStats();
    
    // Chargement des KPIs avancés
    this.loadRHKPIs();
    
    // Chargement des distributions
    this.loadDistributions();
    
    // Chargement des stagiaires terminant bientôt
    this.loadEndingSoonStagiaires();
    
    // Chargement des comptes en attente
    this.loadPendingAccounts();
    
    // Chargement des stagiaires récents
    this.loadRecentStagiaires();
    
    // Chargement des activités récentes
    this.loadRecentActivities();
  }

  private loadStats(): void {
    this.statisticsService.getDashboardStatistics('rh').pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.hasError = true;
        this.errorMessage = 'Impossible de charger les statistiques. Veuillez réessayer.';
        return of({
          activeStages: 0,
          activeTuteurs: 0,
          pendingAccounts: 0,
          validatedDocuments: 0
        });
      })
    ).subscribe(stats => {
      this.rhStats = stats;
    });
  }

  private loadRHKPIs(): void {
    this.statisticsService.getRHKPIs().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des KPIs avancés:', error);
        return of({});
      })
    ).subscribe(kpis => {
      this.rhKPIs = kpis;
    });
  }

  private loadDistributions(): void {
    // Chargement de la distribution par département
    this.statisticsService.getDepartmentDistribution().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement de la distribution par département:', error);
        return of([]);
      })
    ).subscribe(data => {
      this.departmentDistribution = {
        labels: data.map(item => item.name),
        datasets: [{
          data: data.map(item => item.value),
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#3F51B5', '#E91E63']
        }]
      };
    });

    // Chargement de la distribution par type de stage
    this.statisticsService.getStageTypeDistribution().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement de la distribution par type de stage:', error);
        return of([]);
      })
    ).subscribe(data => {
      this.stageTypeDistribution = {
        labels: data.map(item => item.name),
        datasets: [{
          data: data.map(item => item.value),
          backgroundColor: ['#3F51B5', '#E91E63', '#9E9E9E']
        }]
      };
    });

    // Chargement de la distribution par niveau d'études
    this.statisticsService.getEducationLevelDistribution().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement de la distribution par niveau d\'études:', error);
        return of([]);
      })
    ).subscribe(data => {
      this.educationLevelDistribution = {
        labels: data.map(item => item.name),
        datasets: [{
          data: data.map(item => item.value),
          backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#9E9E9E']
        }]
      };
    });

    // Chargement de la distribution par université
    this.statisticsService.getUniversityDistribution().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement de la distribution par université:', error);
        return of([]);
      })
    ).subscribe(data => {
      this.universityDistribution = {
        labels: data.map(item => item.name),
        datasets: [{
          data: data.map(item => item.value),
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#3F51B5', '#E91E63', '#9E9E9E']
        }]
      };
    });

    // Chargement de la distribution mensuelle des stages
    this.statisticsService.getMonthlyStageDistribution().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement de la distribution mensuelle des stages:', error);
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(data => {
      this.monthlyStageDistribution = {
        labels: data.map(item => item.month),
        datasets: [
          {
            label: 'Début de stage',
            data: data.map(item => item.starting),
            backgroundColor: '#4CAF50'
          },
          {
            label: 'Fin de stage',
            data: data.map(item => item.ending),
            backgroundColor: '#F44336'
          }
        ]
      };
    });
  }

  private loadEndingSoonStagiaires(): void {
    // Charger les stagiaires terminant bientôt
    this.statisticsService.getStagiairesEndingSoon(30).pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des stagiaires terminant bientôt:', error);
        return of([]);
      })
    ).subscribe(stagiaires => {
      this.endingSoonStagiaires = stagiaires;
    });
  }

  private loadPendingAccounts(): void {
    // Récupérer les comptes en attente via le service
    this.userService.getPendingRequests().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des comptes en attente:', error);
        return of([]);
      })
    ).subscribe(accounts => {
      this.pendingAccounts = accounts.map(account => ({
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        role: account.requestType === 'Activation Compte' ? 'Stagiaire' : account.requestType,
        departmentName: account.departmentName || 'Non spécifié',
        registerDate: new Date(account.timestamp ? account.timestamp : Date.now())
      }));
    });
  }

  private loadRecentStagiaires(): void {
    // Récupérer les stagiaires récemment ajoutés
    this.userService.getRecentUsers(3).pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des stagiaires récents:', error);
        return of([]);
      })
    ).subscribe(users => {
      // Filtrer uniquement les stagiaires
      const recentStagiaires = users.filter(user => user.role === 'Stagiaire');
      
      // Convertir en format attendu par l'interface
      this.recentlyStagiaires = recentStagiaires.map(stagiaire => ({
        id: stagiaire.id,
        firstName: stagiaire.firstName,
        lastName: stagiaire.lastName,
        email: stagiaire.email,
        tuteur: stagiaire.tuteurName || 'Non assigné',
        startDate: stagiaire.startDate ? new Date(stagiaire.startDate) : new Date(),
        endDate: stagiaire.endDate ? new Date(stagiaire.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 jours par défaut
      }));
    });
  }

  private loadRecentActivities(): void {
    // Récupérer les activités récentes
    this.statisticsService.getRecentActivities().pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des activités récentes:', error);
        return of([]);
      })
    ).subscribe(activities => {
      this.recentActivities = activities;
    });
  }

  approveAccount(accountId: number): void {
    this.userService.approveRequest(accountId).pipe(
      catchError(error => {
        console.error('Erreur lors de l\'approbation du compte:', error);
        return of({ success: false });
      })
    ).subscribe(response => {
      if (response.success) {
        // Mettre à jour la liste des comptes en attente
        this.pendingAccounts = this.pendingAccounts.filter(account => account.id !== accountId);
        this.rhStats.pendingAccounts--;
        
        // Ajouter une activité
        const newActivity = {
          text: "Compte approuvé",
          time: "À l'instant",
          type: "completion"
        };
        this.recentActivities.unshift(newActivity);
      } else {
        alert('Une erreur est survenue lors de l\'approbation du compte.');
      }
    });
  }

  rejectAccount(accountId: number): void {
    this.userService.rejectRequest(accountId).pipe(
      catchError(error => {
        console.error('Erreur lors du rejet du compte:', error);
        return of({ success: false });
      })
    ).subscribe(response => {
      if (response.success) {
        // Mettre à jour la liste des comptes en attente
        this.pendingAccounts = this.pendingAccounts.filter(account => account.id !== accountId);
        this.rhStats.pendingAccounts--;
        
        // Ajouter une activité
        const newActivity = {
          text: "Compte rejeté",
          time: "À l'instant",
          type: "document"
        };
        this.recentActivities.unshift(newActivity);
      } else {
        alert('Une erreur est survenue lors du rejet du compte.');
      }
    });
  }

  formatDateRange(startDate: Date, endDate: Date): string {
    if (!startDate || !endDate) return 'Dates non définies';
    
    // Format: DD/MM/YYYY - DD/MM/YYYY
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  getDurationInMonths(startDate: Date, endDate: Date): number {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculer les mois de différence
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }
}