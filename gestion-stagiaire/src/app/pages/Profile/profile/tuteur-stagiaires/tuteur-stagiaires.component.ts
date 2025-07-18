import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

import { UserService } from '../../../../services/User/user.service';
import { ProjectService } from '../../../../services/Project/project.service';
import { SprintService } from '../../../../services/Sprint/sprint.service';
import { environment } from '../../../../environments/environment';
import { TaskStatus } from '../../../../components/models/Task';
import { SprintStatus } from '../../../../components/models/Sprint';

@Component({
  selector: 'app-tuteur-stagiaires',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './tuteur-stagiaires.component.html',
  styleUrls: ['./tuteur-stagiaires.component.scss']
})
export class TuteurStagiairesComponent implements OnInit {
  @Input() tuteurId!: number;
  
  stagiaires: any[] = [];
  stagiairesProjets: Map<number, any> = new Map();
  
  loading = true;
  error: string | null = null;
  currentUser: any = null;
  readonly TASK_STATUS_COMPLETED = TaskStatus.Done;
  readonly SPRINT_STATUS_COMPLETED = SprintStatus.Done;
  
  constructor(
    private userService: UserService,
    private projectService: ProjectService,
    private sprintService: SprintService
  ) {}
  
  ngOnInit(): void {
    if (this.tuteurId) {
      this.loadStagiaires();
    } else {
      this.error = "ID du tuteur non fourni";
      this.loading = false;
    }
  }
  
  loadStagiaires(): void {
    this.loading = true;
    
    this.userService.getStagiairesByTuteur(this.tuteurId).subscribe({
      next: (stagiaires) => {
        this.stagiaires = stagiaires;
        console.log('Stagiaires chargés:', stagiaires.length);
        
        if (stagiaires.length > 0) {
          this.loadProjetsPourStagiaires();
        } else {
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = "Erreur lors du chargement des stagiaires";
        this.loading = false;
        console.error('Erreur lors du chargement des stagiaires:', err);
      }
    });
  }
  
  loadProjetsPourStagiaires(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        console.log('Tous les projets chargés:', projects.length);
        
        this.stagiaires.forEach(stagiaire => {
          // Chercher un projet où le stagiaire est dans la liste des utilisateurs
          const assignedProject = projects.find(project => 
            project.users && 
            project.users.some((user: any) => user.id === stagiaire.id || user.userId === stagiaire.id)
          );
          
          if (assignedProject) {
            // Charger les sprints pour ce projet
            this.loadSprintsForProject(assignedProject, stagiaire.id);
          } else {
            // Si aucun projet n'est trouvé, assigner un projet simulé
            this.stagiairesProjets.set(stagiaire.id, { 
              title: "Non assigné", 
              sprints: [],
              completedSprints: 0,
              totalSprints: 0,
              progress: 0
            });
            
            this.checkIfAllProjectsLoaded();
          }
        });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des projets:', err);
        
        // En cas d'erreur, assigner des projets par défaut
        this.stagiaires.forEach(stagiaire => {
          this.stagiairesProjets.set(stagiaire.id, { 
            title: "Erreur de chargement", 
            sprints: [],
            completedSprints: 0,
            totalSprints: 0,
            progress: 0
          });
        });
        
        this.loading = false;
      }
    });
  }
  
  loadSprintsForProject(project: any, stagiaireId: number): void {
    if (!project.id) {
      this.stagiairesProjets.set(stagiaireId, {
        ...project,
        sprints: [],
        completedSprints: 0,
        totalSprints: 0,
        progress: 0
      });
      
      this.checkIfAllProjectsLoaded();
      return;
    }
    
    this.sprintService.getSprintsByProjectId(project.id).subscribe({
      next: (sprints) => {
        // Calculer le nombre de sprints complétés
        const completedSprints = sprints.filter(sprint => {
          if (sprint.status === this.SPRINT_STATUS_COMPLETED) return true;
          if (typeof sprint.status === 'string') {
            const statusStr = String(sprint.status).toLowerCase();
            return statusStr.includes('done') || statusStr.includes('completed');
          }
          return false;
        }).length;
        
        // Calculer le pourcentage de progression
        const progress = sprints.length > 0 
          ? Math.round((completedSprints / sprints.length) * 100) 
          : 0;
        
        this.stagiairesProjets.set(stagiaireId, {
          ...project,
          sprints: sprints,
          completedSprints: completedSprints,
          totalSprints: sprints.length,
          progress: progress
        });
        
        this.checkIfAllProjectsLoaded();
      },
      error: (err) => {
        console.error(`Erreur lors du chargement des sprints pour le projet ${project.id}:`, err);
        
        // En cas d'erreur, ajouter des données par défaut
        this.stagiairesProjets.set(stagiaireId, {
          ...project,
          sprints: [],
          completedSprints: 0,
          totalSprints: 0,
          progress: 0
        });
        
        this.checkIfAllProjectsLoaded();
      }
    });
  }
  
  checkIfAllProjectsLoaded(): void {
    const allProjectsLoaded = this.stagiaires.every(stagiaire => 
      this.stagiairesProjets.has(stagiaire.id)
    );
    
    if (allProjectsLoaded) {
      this.loading = false;
    }
  }
  
  getImageUrl(relativeUrl: string | null): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    
    // Si c'est déjà une URL complète, retournez-la telle quelle
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Sinon, préfixez avec l'URL du backend
    return `${environment.apiUrl}${relativeUrl}`;
  }
  
  // Gestion des erreurs d'image
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/default-profile.jpg';
  }
  
  // Générer les initiales pour l'avatar
  getInitials(firstName: string, lastName: string): string {
    return firstName && lastName
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : '??';
  }
  
  // Générer une couleur de fond basée sur le nom
  getAvatarColor(firstName: string, lastName: string): string {
    const name = `${firstName}${lastName}`;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 60%)`;
  }
  
  // Calculer la progression du stage
  getStagiaireProgress(stagiaire: any): number {
    const today = new Date();
    const startDate = stagiaire.startDate ? new Date(stagiaire.startDate) : null;
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : null;
    
    if (!startDate || !endDate) {
      return 0;
    }
    
    if (endDate < today) {
      return 100;
    }
    
    if (startDate > today) {
      return 0;
    }
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    
    const progress = Math.round((elapsed / totalDuration) * 100);
    return Math.min(Math.max(progress, 0), 100);
  }
  
  // Déterminer le statut du stagiaire
  getStagiaireStatus(stagiaire: any): string {
    const today = new Date();
    const startDate = stagiaire.startDate ? new Date(stagiaire.startDate) : null;
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : null;
    
    if (endDate && endDate < today) {
      return 'Terminé';
    }
    
    if (startDate && startDate > today) {
      return 'À venir';
    }
    
    if (startDate && (!endDate || endDate >= today) && startDate <= today) {
      if (endDate) {
        const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (remainingDays <= 14) {
          return 'En évaluation';
        }
      }
      return 'Actif';
    }
    
    return 'Indéterminé';
  }
  
  // Obtenir la classe CSS pour le status
  getStagiaireStatusClass(stagiaire: any): string {
    const status = this.getStagiaireStatus(stagiaire);
    
    switch (status) {
      case 'Actif':
        return 'status-active';
      case 'À venir':
        return 'status-incoming';
      case 'Terminé':
        return 'status-completed';
      case 'En évaluation':
        return 'status-evaluation';
      default:
        return '';
    }
  }
  
  // Obtenir le projet du stagiaire
  getProject(stagiaireId: number): any {
    return this.stagiairesProjets.get(stagiaireId) || { 
      title: "Non assigné", 
      progress: 0,
      completedSprints: 0,
      totalSprints: 0
    };
  }
  
  // Calculer temps restant en jours
  getRemainingDays(stagiaire: any): number | null {
    const today = new Date();
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : null;
    
    if (!endDate) return null;
    
    // Si le stage est déjà terminé
    if (endDate < today) return 0;
    
    // Calculer les jours restants
    const remainingTime = endDate.getTime() - today.getTime();
    return Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
  }
  
  // Obtenir l'université d'un stagiaire
  getUniversityName(stagiaire: any): string {
    return stagiaire.universityName || stagiaire.university?.universityname || 'Non spécifiée';
  }
   hasTuteurAccess(): boolean {
    const adminRoles = [ 'Tuteur'];
    return this.currentUser && adminRoles.includes(this.currentUser.role);
  }
}