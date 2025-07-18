import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../../../services/User/user.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { AffecterStagiairesComponent } from '../affecter-stagiaires/affecter-stagiaires.component';
import { environment } from '../../../environments/environment';
import { ProjectService } from '../../../services/Project/project.service';
import { SprintService } from '../../../services/Sprint/sprint.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TaskStatus } from '../../models/Task';
import { SprintStatus } from '../../models/Sprint';

@Component({
  selector: 'app-mes-stagiaires',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './mes-stagiaires.component.html',
  styleUrls: ['./mes-stagiaires.component.scss']
})
export class MesStagiairesComponent implements OnInit {
  // Constante pour le statut des sprints et tâches complétées
  readonly TASK_STATUS_COMPLETED = TaskStatus.Done;
  readonly SPRINT_STATUS_COMPLETED = SprintStatus.Done;
  
  stagiaires: any[] = [];
  loading = true;
  error: string | null = null;
  currentUser: any;
  displayedColumns: string[] = ['photo', 'nom', 'email', 'dateDebut', 'dateFin', 'actions'];
  
  // Map pour stocker le projet assigné à chaque stagiaire
  stagiairesProjects: Map<number, any> = new Map();
  
  constructor(
    private userService: UserService,
    private authService: AuthService,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser && this.currentUser.role === 'Tuteur') {
      this.loadStagiaires();
    } else {
      this.error = "Vous n'avez pas les autorisations nécessaires pour accéder à cette page.";
      this.loading = false;
    }
  }
  
  loadStagiaires(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.error = "Impossible d'identifier l'utilisateur connecté";
      this.loading = false;
      return;
    }
    
    this.loading = true;
    this.userService.getStagiairesByTuteur(this.currentUser.id).subscribe({
      next: (stagiaires) => {
        this.stagiaires = stagiaires;
        console.log('Stagiaires chargés:', stagiaires.length);
        
        // Si nous avons des stagiaires, chargeons tous les projets
        if (stagiaires.length > 0) {
          this.loadAllProjects();
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
  
  // Méthode pour charger tous les projets
  loadAllProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        console.log('Tous les projets chargés:', projects.length);
        
        // Pour chaque stagiaire, trouver le projet auquel il est assigné
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
            this.stagiairesProjects.set(stagiaire.id, { 
              title: "Non assigné", 
              sprints: [],
              completedSprints: 0,
              totalSprints: 0
            });
          }
        });
        
        // Si aucun projet n'a été trouvé pour les stagiaires, on peut terminer le chargement
        if ([...this.stagiairesProjects.values()].length === 0) {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des projets:', err);
        
        // En cas d'erreur, assigner des projets simulés
        this.stagiaires.forEach(stagiaire => {
          this.stagiairesProjects.set(stagiaire.id, { 
            title: "Projet EY", 
            sprints: [],
            completedSprints: Math.floor(Math.random() * 3), // 0 à 2 sprints complétés
            totalSprints: Math.floor(Math.random() * 3) + 3  // 3 à 5 sprints au total
          });
        });
        
        this.loading = false;
      }
    });
  }
  
  // Nouvelle méthode pour charger les sprints d'un projet
  loadSprintsForProject(project: any, stagiaireId: number): void {
    if (!project.id) {
      this.stagiairesProjects.set(stagiaireId, {
        ...project,
        sprints: [],
        completedSprints: 0,
        totalSprints: 0
      });
      return;
    }
    
    this.sprintService.getSprintsByProjectId(project.id).subscribe({
      next: (sprints) => {
        console.log(`Sprints chargés pour le projet ${project.id}:`, sprints.length);
        
        // Calculer le nombre de sprints complétés
        const completedSprints = sprints.filter(sprint => {
          // Gérer les différentes façons dont le statut pourrait être représenté
          if (sprint.status === this.SPRINT_STATUS_COMPLETED) return true;
          // Si le statut est une chaîne, essayer de faire une comparaison insensible à la casse
          if (typeof sprint.status === 'string') {
            const statusStr = String(sprint.status).toLowerCase();
            return statusStr.includes('done') || statusStr.includes('completed');
          }
          return false;
        }).length;
        
        this.stagiairesProjects.set(stagiaireId, {
          ...project,
          sprints: sprints,
          completedSprints: completedSprints,
          totalSprints: sprints.length
        });
        
        // Vérifier si tous les projets ont été chargés
        const allProjectsLoaded = this.stagiaires.every(stagiaire => 
          this.stagiairesProjects.has(stagiaire.id)
        );
        
        if (allProjectsLoaded) {
          this.loading = false;
        }
      },
      error: (err) => {
        console.error(`Erreur lors du chargement des sprints pour le projet ${project.id}:`, err);
        
        // En cas d'erreur, ajouter des données par défaut
        this.stagiairesProjects.set(stagiaireId, {
          ...project,
          sprints: [],
          completedSprints: 0,
          totalSprints: 0
        });
        
        // Vérifier si tous les projets ont été traités
        const allProjectsProcessed = this.stagiaires.every(stagiaire => 
          this.stagiairesProjects.has(stagiaire.id)
        );
        
        if (allProjectsProcessed) {
          this.loading = false;
        }
      }
    });
  }
  
  // Méthode pour retirer un stagiaire avec confirmation améliorée
  retirerStagiaire(stagiaireId: number): void {
    if (confirm('Êtes-vous sûr de vouloir retirer ce stagiaire de votre supervision ?')) {
      this.loading = true;
      this.userService.retirerStagiaire(stagiaireId).subscribe({
        next: () => {
          // Mettre à jour la liste après la suppression
          this.stagiaires = this.stagiaires.filter(s => s.id !== stagiaireId);
          this.loading = false;
          this.snackBar.open('Stagiaire retiré avec succès', 'Fermer', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        },
        error: (err) => {
          this.error = "Erreur lors du retrait du stagiaire";
          this.loading = false;
          console.error('Erreur lors du retrait du stagiaire:', err);
          this.snackBar.open('Erreur lors du retrait du stagiaire', 'Fermer', {
            duration: 3000,
            panelClass: 'error-snackbar'
          });
        }
      });
    }
  }
  
  // Ouvrir le dialogue d'affectation de stagiaires
  ouvrirDialogAffectation(): void {
    if (!this.currentUser || !this.currentUser.id) {
      this.snackBar.open('Impossible d\'identifier le tuteur connecté', 'Fermer', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
      return;
    }
    
    const dialogRef = this.dialog.open(AffecterStagiairesComponent, {
      width: '550px',
      data: {
        tuteurId: this.currentUser.id,
        tuteurName: `${this.currentUser.firstName} ${this.currentUser.lastName}`
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Rafraîchir la liste des stagiaires après une affectation réussie
        this.loadStagiaires();
        
        // Afficher un message de confirmation
        this.snackBar.open(`${result.count} stagiaire(s) affecté(s) avec succès`, 'Fermer', {
          duration: 5000,
          panelClass: 'success-snackbar'
        });
      }
    });
  }
  
  // Gestion des images 
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
  
  // Déterminer le statut du stagiaire
  getStagiaireStatus(stagiaire: any): string {
    const today = new Date();
    const startDate = stagiaire.startDate ? new Date(stagiaire.startDate) : null;
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : null;
    
    // Stage terminé
    if (endDate && endDate < today) {
      return 'Terminé';
    }
    
    // Stage pas encore commencé
    if (startDate && startDate > today) {
      return 'À venir';
    }
    
    // Stage en cours
    if (startDate && (!endDate || endDate >= today) && startDate <= today) {
      // Si proche de la fin, en évaluation
      if (endDate) {
        const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (remainingDays <= 14) { // Deux semaines avant la fin
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
  
  // Calculer la progression du stage
  getStagiaireProgress(stagiaire: any): number {
    const today = new Date();
    const startDate = stagiaire.startDate ? new Date(stagiaire.startDate) : null;
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : null;
    
    // Si pas de dates, retourner 0
    if (!startDate || !endDate) {
      return 0;
    }
    
    // Si le stage est terminé
    if (endDate < today) {
      return 100;
    }
    
    // Si le stage n'a pas encore commencé
    if (startDate > today) {
      return 0;
    }
    
    // Calculer la progression
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    
    // S'assurer que la valeur est entre 0 et 100
    const progress = Math.round((elapsed / totalDuration) * 100);
    return Math.min(Math.max(progress, 0), 100);
  }
  
  // Obtenir le titre du projet du stagiaire
  getProjectTitle(stagiaire: any): string {
    const project = this.stagiairesProjects.get(stagiaire.id);
    return project ? project.title : "Non assigné";
  }
  
  // Obtenir le nombre de sprints complétés
  getTasksCompleted(stagiaire: any): string {
    const project = this.stagiairesProjects.get(stagiaire.id);
    if (!project) return "0/0";
    
    // Utiliser le nombre de sprints complétés
    const completedSprints = project.completedSprints || 0;
    const totalSprints = project.totalSprints || 0;
    
    return `${completedSprints}/${totalSprints}`;
  }
  
  // Actualiser la liste des stagiaires
  refreshStagiaires(): void {
    this.loadStagiaires();
  }
  
  getProjectId(stagiaire: any): number {
    const project = this.stagiairesProjects.get(stagiaire.id);
    return project && project.id ? project.id : 0;
  }
}