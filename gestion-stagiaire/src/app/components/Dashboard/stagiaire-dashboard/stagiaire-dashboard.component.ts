// stagiaire-dashboard.component.ts - Version dynamique
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
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
import { StatisticsService } from '../../../services/Dashboard/statistics.service';
import { ProjectService } from '../../../services/Project/project.service';
import { SprintService } from '../../../services/Sprint/sprint.service';

// Models - Utilisez vos modèles existants
import { Project } from '../../models/Project';
import { Sprint, SprintStatus } from '../../models/Sprint';
import { Task, TaskStatus } from '../../models/Task';
import { Report } from '../../models/Report';
import { User, Tuteur, UserRole } from '../../models/user';

@Component({
  selector: 'app-stagiaire-dashboard',
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
  templateUrl: './stagiaire-dashboard.component.html',
  styleUrls: ['./stagiaire-dashboard.component.scss']
})
export class StagiaireDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Statistiques de base
  stagiaireStats = {
    daysRemaining: 0,
    submittedDocs: 0,
    completedTasks: 0,
    pendingTasks: 0
  };

  // Données de progression
  progressData: any = {};
  progressByWeek: any[] = [];
  
  // Tuteur et projets - Utilisation des bons types
  myTuteur: Tuteur | null = null;
  myProjects: Project[] = [];
  
  // Documents et activités - Utilisation des bons types
  submittedDocuments: Report[] = [];
  recentActivities: any[] = [];
  
  // Tâches
  tasks: any[] = [];

  // États de chargement
  isLoading = true;
  hasError = false;
  errorMessage = '';

  // Constantes pour les enums
  readonly TASK_STATUS_COMPLETED = TaskStatus.Done;
  readonly SPRINT_STATUS_COMPLETED = SprintStatus.Done;

  // Configuration du graphique de progression
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Progression (%)'
        },
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

  // Injections de services
  private userService = inject(UserService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);
  private statisticsService = inject(StatisticsService);
  private projectService = inject(ProjectService);
  private sprintService = inject(SprintService);

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

    // Charger toutes les données en parallèle
    forkJoin({
      stats: this.statisticsService.getDashboardStatistics('stagiaire').pipe(
        catchError(error => {
          console.error('Erreur statistiques:', error);
          return of(this.getDefaultStats());
        })
      ),
      tuteur: of(this.getTuteurInfo(currentUserId)),
      documents: this.reportService.getReportsByStagiaire(currentUserId).pipe(
        catchError(error => {
          console.error('Erreur documents:', error);
          return of([]);
        })
      ),
      projects: of(this.getProjects(currentUserId)),
      activities: this.userService.getRecentActivities(currentUserId).pipe(
        catchError(error => {
          console.error('Erreur activités:', error);
          return of([]);
        })
      )
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (data) => {
        this.stagiaireStats = data.stats;
        this.myTuteur = await data.tuteur;
        this.submittedDocuments = data.documents;
        this.myProjects = await data.projects;
        this.recentActivities = data.activities;
        
        this.generateProgressData();
        this.generateTasks();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du dashboard:', error);
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des données';
        this.isLoading = false;
      }
    });
  }

  private getCurrentUserId(): number {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.id || 1;
  }

  private getDefaultStats(): any {
    return {
      daysRemaining: 45,
      submittedDocs: 0,
      completedTasks: 0,
      pendingTasks: 0
    };
  }

  private getTuteurInfo(stagiaireId: number): Promise<Tuteur | null> {
    // Récupérer d'abord les informations du stagiaire pour obtenir l'ID du tuteur
    return this.userService.getUserById(stagiaireId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors de la récupération du stagiaire:', error);
        return of(null);
      })
    ).toPromise().then(stagiaire => {
      if (stagiaire && stagiaire.tuteurId) {
        return this.userService.getTuteurById(stagiaire.tuteurId).pipe(
          catchError(error => {
            console.error('Erreur lors de la récupération du tuteur:', error);
            return of(this.getDefaultTuteur());
          })
        ).toPromise();
      } else {
        return this.getDefaultTuteur();
      }
    });
  }

  private getDefaultTuteur(): Tuteur {
    return {
      id: 0,
      username: 'non.assigne',
      email: 'non.assigne@example.com',
      firstName: 'Non',
      lastName: 'Assigné',
      phoneNumber: 'N/A',
      role: UserRole.Tuteur,
      department: { id: 0, departmentName: 'N/A' }
    } as Tuteur;
  }

  private getSubmittedDocuments(stagiaireId: number): any {
    return this.reportService.getReportsByStagiaire(stagiaireId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors de la récupération des documents:', error);
        return of([]);
      })
    ).toPromise();
  }

  private getProjects(stagiaireId: number): Promise<Project[]> {
    console.log('Récupération des projets pour le stagiaire ID:', stagiaireId);
    
    // Essayer d'abord getUserProjects()
    return this.projectService.getUserProjects().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur avec getUserProjects(), tentative de fallback:', error);
        // Fallback : utiliser getAllProjects() et filtrer
        return this.projectService.getAllProjects().pipe(
          catchError(fallbackError => {
            console.error('Erreur avec getAllProjects() aussi:', fallbackError);
            return of([]);
          })
        );
      })
    ).toPromise().then((projects: Project[] | undefined) => {
      if (!projects || projects.length === 0) {
        console.log('Aucun projet trouvé directement, tentative de récupération avec getAllProjects...');
        
        // Tentative avec getAllProjects() si getUserProjects() est vide
        return this.projectService.getAllProjects().pipe(
          catchError(error => {
            console.error('Erreur lors de la récupération de tous les projets:', error);
            return of([]);
          })
        ).toPromise().then((allProjects: Project[] | undefined) => {
          if (!allProjects) {
            console.log('Aucun projet disponible');
            return [];
          }

          console.log(`Total des projets disponibles: ${allProjects.length}`);
          
          // Filtrer les projets où le stagiaire est assigné
          const userProjects = allProjects.filter(project => {
            console.log(`Vérification projet "${project.title}" (ID: ${project.id})`);
            console.log('Users du projet:', project.users);
            console.log('ProjectUsers du projet:', project.projectUsers);
            
            // Vérifier plusieurs propriétés possibles
            const isAssigned = project.users && 
              project.users.some((user: any) => {
                const userId = user.id || user.userId || user.user?.id;
                console.log(`Comparaison: user ID ${userId} === stagiaire ID ${stagiaireId}`);
                return userId === stagiaireId;
              });
            
            const isAssignedViaProjectUsers = project.projectUsers && 
              project.projectUsers.some((projectUser: any) => {
                const userId = projectUser.userId || projectUser.user?.id || projectUser.id;
                console.log(`Comparaison projectUsers: user ID ${userId} === stagiaire ID ${stagiaireId}`);
                return userId === stagiaireId;
              });

            const result = isAssigned || isAssignedViaProjectUsers;
            console.log(`Projet "${project.title}" assigné au stagiaire: ${result}`);
            return result;
          });

          console.log(`Projets filtrés pour le stagiaire: ${userProjects.length}`);
          return this.processProjectsWithSprints(userProjects);
        });
      }

      console.log('Projets utilisateur récupérés directement:', projects.length);
      return this.processProjectsWithSprints(projects);
    });
  }

  private async processProjectsWithSprints(projects: Project[]): Promise<Project[]> {
    // Calculer la progression pour chaque projet
    return Promise.all(projects.map(async project => {
      try {
        const sprints = await this.sprintService.getSprintsByProjectId(project.id!).toPromise();
        const completedSprints = sprints?.filter(sprint => 
          sprint.status === this.SPRINT_STATUS_COMPLETED
        ).length || 0;
        
        const totalSprints = sprints?.length || 0;
        const progress = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0;
        
        console.log(`Projet ${project.title}: ${completedSprints}/${totalSprints} sprints complétés (${progress}%)`);
        
        return {
          ...project,
          progress: progress,
          dueDate: project.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalSprints: totalSprints,
          completedSprints: completedSprints
        };
      } catch (error) {
        console.error(`Erreur lors du chargement des sprints pour le projet ${project.id}:`, error);
        return {
          ...project,
          progress: 0,
          dueDate: project.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalSprints: 0,
          completedSprints: 0
        };
      }
    }));
  }

  // Méthode pour calculer la progression d'un projet
  getProjectProgress(project: Project): number {
    if (!project.sprints || project.sprints.length === 0) {
      return 0;
    }

    let totalTasks = 0;
    let completedTasks = 0;

    project.sprints.forEach(sprint => {
      if (sprint.tasks) {
        totalTasks += sprint.tasks.length;
        completedTasks += sprint.tasks.filter(task => task.status === this.TASK_STATUS_COMPLETED).length;
      }
    });

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  private generateProgressData(): void {
    // Générer des données de progression basées sur les projets réels
    const weeks = this.myProjects.length > 0 ? this.myProjects.length + 2 : 6;
    const labels = Array.from({length: weeks}, (_, i) => `Semaine ${i + 1}`);
    
    // Calculer la progression moyenne des projets
    const averageProgress = this.myProjects.length > 0 
      ? this.myProjects.reduce((sum, project) => {
          const progress = this.getProjectProgress(project);
          return sum + progress;
        }, 0) / this.myProjects.length
      : 0;

    // Générer une progression croissante qui converge vers la progression actuelle
    const data = labels.map((_, index) => {
      const progressionFactor = (index + 1) / labels.length;
      return Math.min(averageProgress * progressionFactor, 100);
    });

    this.progressData = {
      labels: labels,
      datasets: [{
        label: 'Progression',
        data: data,
        backgroundColor: 'rgba(255, 230, 0, 0.2)', // EY Yellow
        borderColor: 'rgba(255, 230, 0, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };

    // Progression par semaine pour les cartes
    this.progressByWeek = labels.slice(-4).map((week, index) => ({
      week: week,
      completed: Math.min(3 + index, 5),
      total: 5
    }));
  }

  private generateTasks(): void {
    // Générer des tâches basées sur les projets réels
    this.tasks = [];
    
    this.myProjects.forEach(project => {
      // Ajouter des tâches basées sur le projet
      const projectProgress = this.getProjectProgress(project);
      if (projectProgress < 100) {
        this.tasks.push({
          id: this.tasks.length + 1,
          title: `Continuer le développement de ${project.title}`,
          dueDate: project.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          priority: projectProgress < 50 ? 'high' : 'medium'
        });
      }
    });

    // Ajouter des tâches basées sur les documents
    this.submittedDocuments.forEach(doc => {
      if (!doc.isApproved && !doc.isRejected) {
        this.tasks.push({
          id: this.tasks.length + 1,
          title: `Attendre la validation de "${doc.title}"`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending',
          priority: 'medium'
        });
      }
    });

    // Ajouter des tâches génériques si pas assez de tâches
    if (this.tasks.length < 3) {
      const genericTasks = [
        {
          id: this.tasks.length + 1,
          title: 'Préparer le rapport hebdomadaire',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          status: 'pending',
          priority: 'high'
        },
        {
          id: this.tasks.length + 2,
          title: 'Réunion avec le tuteur',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          status: 'pending',
          priority: 'medium'
        }
      ];
      
      this.tasks.push(...genericTasks.slice(0, 3 - this.tasks.length));
    }
  }

  // Méthodes utilitaires pour le template
  getStatusClass(status: string): string {
    switch(status) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(document: any): string {
    if (document.isApproved) return 'Approuvé';
    if (document.isRejected) return 'Rejeté';
    return 'En attente';
  }

  getPriorityClass(priority: string): string {
    switch(priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  }

  // Méthode pour actualiser les données
  refreshData(): void {
    this.loadDashboardData();
  }

  // Méthodes pour la gestion des images (cohérence avec les autres dashboards)
  getImageUrl(relativeUrl: string | null): string {
    if (!relativeUrl) return '/assets/images/avatar-placeholder.png';
    
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    return `${environment.apiUrl}${relativeUrl}`;
  }
  
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    
    const parent = img.parentElement;
    if (parent) {
      const name = img.alt || 'User';
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      parent.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
    }
  }

  getInitials(firstName: string, lastName: string): string {
    return firstName && lastName
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : '??';
  }

  // Méthodes pour les projets dans le template
  getCompletedSprints(project: Project): number {
    if (!project.sprints) return 0;
    return project.sprints.filter(sprint => sprint.status === this.SPRINT_STATUS_COMPLETED).length;
  }

  getTotalSprints(project: Project): number {
    return project.sprints?.length || 0;
  }

  // Méthodes utilitaires pour le template (éviter les erreurs Angular)
  getPendingTasksCount(): number {
    return this.tasks.filter(t => t.status !== 'completed').length;
  }

  getSubmittedDocumentsCount(): number {
    return this.submittedDocuments.length;
  }

  getRecentActivitiesCount(): number {
    return this.recentActivities.length;
  }

  hasSubmittedDocuments(): boolean {
    return this.submittedDocuments.length > 0;
  }

  hasRecentActivities(): boolean {
    return this.recentActivities.length > 0;
  }

  hasTasks(): boolean {
    return this.tasks.length > 0;
  }

  isTaskCompleted(task: any): boolean {
    return task.status === 'completed';
  }

  getActivityBackgroundClass(activity: any): string {
    switch(activity.type) {
      case 'completion': return 'bg-green-100';
      case 'message': return 'bg-blue-100';
      case 'user': return 'bg-purple-100';
      case 'document': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  }

  getActivityIconClass(activity: any): string {
    switch(activity.type) {
      case 'completion': return 'text-green-600 fas fa-check-circle';
      case 'message': return 'text-blue-600 fas fa-comment-dots';
      case 'user': return 'text-purple-600 fas fa-user';
      case 'document': return 'text-yellow-600 fas fa-file-alt';
      default: return 'text-gray-600 fas fa-info-circle';
    }
  }

  getTaskStatusClasses(task: any): string {
    return this.isTaskCompleted(task) ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300';
  }

  getTaskTitleClasses(task: any): string {
    return this.isTaskCompleted(task) ? 'line-through text-gray-500 font-medium' : 'font-medium';
  }

  getPriorityText(priority: string): string {
    switch(priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  }

  // Méthode pour obtenir l'icône d'activité (manquante)
  getActivityIcon(type: string): string {
    switch(type) {
      case 'completion': return 'fa-check-circle';
      case 'message': return 'fa-comment-dots';
      case 'user': return 'fa-user-plus';
      case 'document': return 'fa-file-upload';
      default: return 'fa-info-circle';
    }
  }
}