import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../../services/Project/project.service';
import { SprintService } from '../../../services/Sprint/sprint.service';
import { Project } from '../../models/Project';
import { Sprint, SprintStatus } from '../../models/Sprint';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AssignStagiairesDialogComponent } from '../assign-stagiaires-dialog/assign-stagiaires-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../Auth/auth-service.service';
import { SprintReportService } from '../../../services/SprintReportLatex/sprint-report.service';
import { finalize } from 'rxjs/operators';
import {  SprintReportQuestionnaire } from '../../../services/SprintReportLatex/sprint-report.service';
import { MatDialogModule } from '@angular/material/dialog';
// AJOUT IMPORTANT : Importez le dialog component
import { SprintReportDialogComponent, SprintReportFormData } from '../sprint-report-dialog/sprint-report-dialog.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ]
})
export class ProjectDetailComponent implements OnInit {
  // Propriétés du projet
  project: Project | null = null;
  projectUsers: any[] = [];
  stagiaireUsers: any[] = [];
  
  // Propriétés du sprint
  sprints: Sprint[] = [];
  todoSprints: Sprint[] = [];
  inProgressSprints: Sprint[] = [];
  doneSprints: Sprint[] = [];
  sprintForm: FormGroup;
  showSprintForm = false;
  submittingSprint = false;
  
  // Propriétés diverses
  loading = true;
  error: string | null = null;
  today = new Date();
  SprintStatus = SprintStatus;
  
  isGeneratingReport = false;
  selectedStagiaireForReport: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private sprintService: SprintService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    public authService: AuthService,
    private sprintReportService: SprintReportService
  ) {
    // Initialisation du formulaire de sprint
    this.sprintForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProject(+id);
    } else {
      this.error = 'ID de projet invalide';
      this.loading = false;
    }
  }

  /**
   * Charge les détails du projet
   */
  loadProject(id: number): void {
    this.loading = true;
    this.projectService.getProjectById(id).subscribe({
      next: (project) => {
        this.project = project;
        // Chargement parallèle des sprints et des utilisateurs
        this.loadSprints(id);
        this.loadProjectUsers();
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement du projet';
        this.loading = false;
        console.error(err);
      }
    });
  }

  /**
   * Charge les utilisateurs associés au projet
   */
  loadProjectUsers(): void {
    if (!this.project?.id) return;
    
    this.projectService.getProjectUsers(this.project.id).subscribe({
      next: (users) => {
        this.projectUsers = users;
        // Tous les utilisateurs sont considérés comme stagiaires
        this.stagiaireUsers = [...users];
        console.log('Utilisateurs du projet chargés:', users.length);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs du projet', err);
      }
    });
  }

  /**
   * Charge les sprints associés au projet
   */
  loadSprints(projectId: number): void {
    this.sprintService.getSprintsByProjectId(projectId).subscribe({
      next: (sprints) => {
        this.sprints = sprints;
        this.categorizeSprints();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des sprints';
        this.loading = false;
        console.error(err);
      }
    });
  }

  /**
   * Classe les sprints dans les différentes colonnes du Kanban
   */
  categorizeSprints(): void {
    this.todoSprints = this.sprints.filter(s => s.status === SprintStatus.Todo);
    this.inProgressSprints = this.sprints.filter(s => s.status === SprintStatus.InProgress);
    this.doneSprints = this.sprints.filter(s => s.status === SprintStatus.Done);
  }

  /**
   * Affiche/masque le formulaire d'ajout de sprint
   */
  toggleSprintForm(): void {
    this.showSprintForm = !this.showSprintForm;
    if (!this.showSprintForm) {
      this.sprintForm.reset();
    }
  }

  /**
   * Soumet le formulaire d'ajout de sprint
   */
  onSubmitSprint(): void {
    if (this.sprintForm.invalid || !this.project) {
      return;
    }

    this.submittingSprint = true;
    const sprint: Sprint = {
      name: this.sprintForm.get('name')?.value,
      description: this.sprintForm.get('description')?.value,
      status: SprintStatus.Todo,
      startDate: this.sprintForm.get('startDate')?.value,
      endDate: this.sprintForm.get('endDate')?.value,
      projectId: this.project.id as number
    };

    this.sprintService.createSprint(sprint).subscribe({
      next: (newSprint) => {
        this.sprints.push(newSprint);
        this.categorizeSprints();
        this.toggleSprintForm();
        this.submittingSprint = false;
      },
      error: (err) => {
        console.error('Erreur lors de la création du sprint', err);
        this.submittingSprint = false;
        alert('Erreur lors de la création du sprint');
      }
    });
  }

  /**
   * Met à jour le statut d'un sprint
   */
  updateSprintStatus(sprint: Sprint, newStatus: SprintStatus): void {
    if (sprint.status === newStatus) {
      return;
    }

    const statusUpdate = {
      status: newStatus.toString(),
      comments: `Statut modifié via tableau Kanban`
    };

    this.sprintService.updateSprintStatus(sprint.id as number, statusUpdate.status as any, statusUpdate.comments).subscribe({
      next: () => {
        sprint.status = newStatus;
        this.categorizeSprints();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut', err);
        alert('Erreur lors de la mise à jour du statut du sprint');
      }
    });
  }

  /**
   * Navigue vers la page de détail du sprint
   */
  viewSprint(id: number): void {
    this.router.navigate(['/sprints', id], { 
      queryParams: { projectId: this.project?.id } 
    });
  }

  /**
   * Navigue vers la page d'édition du projet
   */
  editProject(): void {
    if (this.project) {
      this.router.navigate(['/projects/edit', this.project.id]);
    }
  }

  /**
   * Ouvre la boîte de dialogue d'affectation des stagiaires
   */
  openAssignStagiairesDialog(): void {
    if (!this.project?.id) {
      console.error('ID du projet non disponible');
      return;
    }
  
    const dialogRef = this.dialog.open(AssignStagiairesDialogComponent, {
      width: '600px',
      data: { 
        projectId: this.project.id,
        projectTitle: this.project.title
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Actualiser les données du projet si nécessaire
        this.loadProject(this.project?.id as number);
      }
    });
  }

  /**
   * Récupérer l'URL de l'image du profil utilisateur
   * Semblable à la méthode dans MesStagiairesComponent
   */
  getImageUrl(relativeUrl: string | null): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    
    // Si c'est déjà une URL complète, la retourner telle quelle
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Sinon, préfixer avec l'URL du backend
    return `${environment.apiUrl}${relativeUrl}`;
  }
  
  /**
   * Gestion des erreurs d'image
   */
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/default-profile.jpg';
  }

  /**
   * Récupérer l'ID d'un utilisateur, quelle que soit sa structure
   */
  getUserId(user: any): number {
    // Essayer différentes structures possibles pour obtenir l'ID
    return user.id || user.userId || user.user?.id || user.user?.userId || 0;
  }

  /**
   * Naviguer vers la page de détail du stagiaire
   */
  viewStagiaire(stagiaireId: number): void {
    if (stagiaireId) {
      this.router.navigate(['/stagiaire', stagiaireId]);
    } else {
      console.error('ID du stagiaire non disponible');
    }
  }

  // Méthodes utilitaires pour l'affichage des utilisateurs

  /**
   * Retourne les initiales d'un utilisateur
   */
  getInitials(user: any): string {
    const firstName = this.getFirstName(user);
    const lastName = this.getLastName(user);
    
    return (firstName.charAt(0) || '?') + (lastName.charAt(0) || '');
  }
  
  /**
   * Génère un dégradé de couleur unique pour l'avatar basé sur l'index
   */
  getAvatarGradient(index: number): string {
    // Palette de couleurs vives et professionnelles
    const gradients = [
      'linear-gradient(135deg, #FF5722, #FF9800)', // Orange
      'linear-gradient(135deg, #4CAF50, #8BC34A)', // Vert
      'linear-gradient(135deg, #2196F3, #03A9F4)', // Bleu
      'linear-gradient(135deg, #9C27B0, #673AB7)', // Violet
      'linear-gradient(135deg, #F44336, #E91E63)', // Rouge
      'linear-gradient(135deg, #009688, #4DB6AC)', // Turquoise
      'linear-gradient(135deg, #FFC107, #FFEB3B)', // Jaune
      'linear-gradient(135deg, #607D8B, #90A4AE)', // Bleu-gris
      'linear-gradient(135deg, #795548, #A1887F)', // Marron
      'linear-gradient(135deg, #E91E63, #F48FB1)'  // Rose
    ];
    
    // Utiliser le modulo pour s'assurer que nous avons toujours un index valide
    const gradientIndex = index % gradients.length;
    return gradients[gradientIndex];
  }

  /**
   * Récupère le prénom d'un utilisateur quelle que soit la structure de données
   */
  getFirstName(user: any): string {
    return user.firstName || user.first_name || user.prenom || 
           user.user?.firstName || user.user?.first_name || user.user?.prenom || 
           user.name?.split(' ')[0] || '';
  }

  /**
   * Récupère le nom de famille d'un utilisateur quelle que soit la structure de données
   */
  getLastName(user: any): string {
    return user.lastName || user.last_name || user.nom || 
           user.user?.lastName || user.user?.last_name || user.user?.nom || 
           user.name?.split(' ')[1] || '';
  }

  /**
   * Récupère le nom complet d'un utilisateur
   */
  getUserFullName(user: any): string {
    const firstName = this.getFirstName(user);
    const lastName = this.getLastName(user);
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    // Fallback sur d'autres propriétés
    return user.name || user.username || user.email || user.user?.name || 
           user.user?.username || user.user?.email || 'Utilisateur';
  }

  /**
   * Récupère l'email d'un utilisateur quelle que soit la structure de données
   */
  getUserEmail(user: any): string {
    return user.email || user.mail || user.user?.email || user.user?.mail || '';
  }
  
  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  /**
   * NOUVELLE MÉTHODE : Génère un rapport PDF pour un stagiaire spécifique avec questionnaire
   */
 
  /**
 * Génère un rapport PDF pour un stagiaire spécifique avec questionnaire
 */
generateSprintReportForStagiaire(stagiaireId: number, stagiaireFullName: string): void {
  console.log('Ouverture du dialog pour:', stagiaireFullName);
  
  // Ouvrir le dialog de questionnaire
  const dialogRef = this.dialog.open(SprintReportDialogComponent, {
    width: '700px',
    maxWidth: '90vw',
    data: { 
      stagiaireFullName: stagiaireFullName,
      isForOthers: true 
    },
    disableClose: true
  });

  dialogRef.afterClosed().subscribe((formData: SprintReportFormData | null) => {
    if (formData) {
      console.log('Données du formulaire reçues:', formData);
      // L'utilisateur a rempli le questionnaire, générer le rapport
      this.isGeneratingReport = true;

      const questionnaire = {
        learnings: formData.learnings,
        skills: formData.skills,
        difficulties: formData.difficulties
      };

      this.sprintReportService.generateSprintReportForStagiaire(stagiaireId, questionnaire).pipe(
        finalize(() => this.isGeneratingReport = false)
      ).subscribe({
        next: (response: Blob) => {
          const sanitizedName = stagiaireFullName.replace(/\s+/g, '_');
          const fileName = `Rapport_Sprint_${sanitizedName}_${new Date().toISOString().split('T')[0]}.pdf`;
          this.downloadBlob(response, fileName);
          
          console.log(`Rapport généré avec succès pour ${stagiaireFullName}`);
          alert(`🎉 Rapport PDF généré avec succès pour ${stagiaireFullName} !`);
        },
        error: (error) => {
          console.error('Erreur génération rapport:', error);
          alert(`Erreur lors de la génération du rapport pour ${stagiaireFullName}: ${error.message || 'Erreur inconnue'}`);
        }
      });
    } else {
      console.log('Dialog fermé sans données - pas de génération');
    }
  });
}

  /**
   * NOUVELLE MÉTHODE : Génère un rapport PDF pour le stagiaire connecté avec questionnaire
   */
generateMySprintReport(): void {
  console.log('Ouverture du dialog pour mon rapport');
  
  // Ouvrir le dialog de questionnaire
  const dialogRef = this.dialog.open(SprintReportDialogComponent, {
    width: '700px',
    maxWidth: '90vw',
    data: { 
      isForOthers: false 
    },
    disableClose: true
  });

  dialogRef.afterClosed().subscribe((formData: SprintReportFormData | null) => {
    if (formData) {
      console.log('Données du formulaire reçues:', formData);
      // L'utilisateur a rempli le questionnaire, générer le rapport
      this.isGeneratingReport = true;

      const questionnaire = {
        learnings: formData.learnings,
        skills: formData.skills,
        difficulties: formData.difficulties
      };

      this.sprintReportService.generateMySprintReport(questionnaire).pipe(
        finalize(() => this.isGeneratingReport = false)
      ).subscribe({
        next: (response: Blob) => {
          const fileName = `Mon_Rapport_Sprint_${new Date().toISOString().split('T')[0]}.pdf`;
          this.downloadBlob(response, fileName);
          
          console.log('Mon rapport généré avec succès');
          alert('🎉 Rapport PDF généré avec succès avec votre questionnaire !');
        },
        error: (error) => {
          console.error('Erreur génération de mon rapport:', error);
          alert(`Erreur lors de la génération de votre rapport: ${error.message || 'Erreur inconnue'}`);
        }
      });
    } else {
      console.log('Dialog fermé sans données - pas de génération');
    }
  });
}

  /**
   * Télécharge un blob en tant que fichier
   */
  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  /**
   * Vérifie si l'utilisateur connecté est un stagiaire
   */
  isCurrentUserStagiaire(): boolean {
    return this.authService.hasRole('Stagiaire');
  }

  /**
   * Vérifie si l'utilisateur connecté peut générer des rapports pour d'autres
   */
  canGenerateReportsForOthers(): boolean {
    return this.authService.hasRole('Tuteur') || this.authService.hasRole('RHs') || this.authService.hasRole('Admin');
  }
}