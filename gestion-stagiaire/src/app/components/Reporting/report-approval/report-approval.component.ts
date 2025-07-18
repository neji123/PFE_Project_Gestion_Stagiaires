// report-approval.component.ts
import { Component, OnInit } from '@angular/core';
import { ReportService } from '../../../services/Report/report.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { Report } from '../../models/Report';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { User,UserRole } from '../../models/user';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
@Component({
  selector: 'app-report-approval',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    SidebarComponent
  ],
  templateUrl: './report-approval.component.html',
  styleUrl: './report-approval.component.scss'
})
export class ReportApprovalComponent implements OnInit {
  isSidebarVisible = true;
  reports: Report[] = [];
  pendingReports: Report[] = [];
  approvedReports: Report[] = [];
  rejectedReports: Report[] = [];
  isLoading = true;
  error: string | null = null;
  currentUser: User | null = null;
  feedbackForm: FormGroup;
  selectedReport: Report | null = null;

  stagiaires: User[] = [];
  selectedStagiaire: User | null = null;
  showStagiairesList: boolean = true;
  
  allPendingReports: Report[] = [];
  displayedColumns: string[] = ['title', 'reportType', 'stagiaire', 'submissionDate', 'actions'];
  
  constructor(
    private reportService: ReportService,
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    this.feedbackForm = this.fb.group({
      feedback: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadUserInfo();
  }

  loadUserInfo() {
    this.isLoading = true;
    
    if (this.authService.currentUserValue) {
      this.currentUser = this.authService.currentUserValue;
      this.loadReports();
    } else {
      this.authService.currentUser.subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = user;
            this.loadReports();
          } else {
            this.error = 'Utilisateur non connecté';
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Erreur lors de la récupération de l\'utilisateur', err);
          this.error = 'Erreur lors de la récupération de l\'utilisateur';
          this.isLoading = false;
        }
      });
    }
  }
  loadReports() {
    // Si c'est un admin ou RH, charger tous les stagiaires via GetUsersByRole
    if (this.currentUser?.role === UserRole.Admin || this.currentUser?.role === UserRole.RHs) {
      this.loadStagiairesByRole();
    } 
    // Si c'est un tuteur, charger ses stagiaires assignés
    else if (this.currentUser?.role === UserRole.Tuteur) {
      this.loadStagiaires();
    } else {
      this.error = 'Vous n\'avez pas les permissions nécessaires';
      this.isLoading = false;
    }
  }
  
  // Nouvelle méthode pour charger tous les stagiaires via l'endpoint GetUsersByRole
  loadStagiairesByRole() {
    this.isLoading = true;
    
    this.userService.getUsersByRole('Stagiaire').subscribe({
      next: (stagiaires) => {
        console.log('Stagiaires chargés par rôle:', stagiaires);
        this.stagiaires = stagiaires;
        
        // Une fois tous les stagiaires chargés, charger tous leurs rapports en attente
        this.loadAllPendingReports();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des stagiaires par rôle:', err);
        
        // En cas d'échec, essayer avec getAllUsers() comme solution de secours
        this.userService.getAllUsers().subscribe({
          next: (users) => {
            console.log('Utilisateurs chargés:', users);
            
            // Filtrer uniquement les stagiaires
            this.stagiaires = users.filter(user => {
              const userAny = user as any;
              return user.role === UserRole.Stagiaire || 
                    (typeof userAny.role === 'string' && userAny.role === 'Stagiaire') ||
                    userAny.roleId === 3 || 
                    (typeof userAny.role === 'number' && userAny.role === 3);
            });
            
            console.log('Stagiaires filtrés:', this.stagiaires);
            this.loadAllPendingReports();
          },
          error: (secondErr) => {
            console.error('Erreur lors de la récupération de tous les utilisateurs:', secondErr);
            this.error = 'Erreur lors de la récupération des stagiaires';
            this.isLoading = false;
          }
        });
      }
    });
  }
  loadAllStagiaires() {
    this.isLoading = true;
    
    // Utiliser getUsersByRole au lieu de getAllStagiaires
    this.userService.getUsersByRole('Stagiaire').subscribe({
      next: (stagiaires) => {
        this.stagiaires = stagiaires;
        
        // Une fois tous les stagiaires chargés, charger tous leurs rapports en attente
        this.loadAllPendingReports();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des stagiaires', err);
        this.error = 'Erreur lors de la récupération des stagiaires';
        this.isLoading = false;
      }
    });
  }
  loadStagiaires() {
    this.isLoading = true;
    
    this.userService.getStagiairesByTuteur(this.currentUser?.id as number).subscribe({
      next: (stagiaires) => {
        this.stagiaires = stagiaires;
        
        // Une fois les stagiaires chargés, chargeons tous leurs rapports en attente
        this.loadAllPendingReports();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des stagiaires', err);
        this.error = 'Erreur lors de la récupération des stagiaires';
        this.isLoading = false;
      }
    });
  }
  loadAllPendingReports() {
    // Si aucun stagiaire n'est assigné, terminons le chargement
    if (this.stagiaires.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Créons un tableau pour stocker les observables des requêtes de rapports
    const reportRequests: Observable<Report[]>[] = [];
    
    // Pour chaque stagiaire, créons une requête pour obtenir ses rapports
    this.stagiaires.forEach(stagiaire => {
      reportRequests.push(
        this.reportService.getReportsByStagiaire(stagiaire.id).pipe(
          catchError(error => {
            console.error(`Erreur lors du chargement des rapports pour ${stagiaire.firstName} ${stagiaire.lastName}:`, error);
            return of([]); // En cas d'erreur, retournons un tableau vide
          })
        )
      );
    });
    
    // Utilisons forkJoin pour exécuter toutes les requêtes en parallèle
    forkJoin(reportRequests).subscribe({
      next: (reportsArrays) => {
        // Fusionnons tous les tableaux de rapports
        let allReports: Report[] = [];
        reportsArrays.forEach(reports => {
          allReports = [...allReports, ...reports];
        });
        
        // Filtrons pour ne garder que les rapports en attente
        this.allPendingReports = allReports.filter(report => !report.isApproved && !report.isRejected);
        
        // Si l'utilisateur est un Admin ou RH, afficher une alerte si le nombre de rapports est élevé
        if ((this.currentUser?.role === UserRole.Admin || this.currentUser?.role === UserRole.RHs) && this.allPendingReports.length > 20) {
          this.snackBar.open(`${this.allPendingReports.length} rapports en attente d'approbation. Considérez filtrer par stagiaire pour une meilleure expérience.`, 'Fermer', {
            duration: 5000
          });
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des rapports:', err);
        this.isLoading = false;
      }
    });
  }
  selectStagiaire(stagiaire: User) {
    this.isLoading = true;
    this.selectedStagiaire = stagiaire;
    this.showStagiairesList = false;
    
    // Charger les rapports de ce stagiaire
    this.reportService.getReportsByStagiaire(stagiaire.id).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.filterReports();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des rapports', err);
        this.error = 'Erreur lors de la récupération des rapports';
        this.isLoading = false;
      }
    });
  }
  backToStagiairesList() {
    this.showStagiairesList = true;
    this.selectedStagiaire = null;
    this.reports = [];
    this.pendingReports = [];
    this.approvedReports = [];
    this.rejectedReports = [];
  }

  loadAllReports() {
    // À implémenter dans le service reportService
    // Cette méthode devra être ajoutée dans le backend
    this.reportService.getAllReports().subscribe({
      next: (reports) => {
        this.reports = reports;
        this.filterReports();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des rapports', err);
        this.error = 'Erreur lors de la récupération des rapports';
        this.isLoading = false;
      }
    });
  }

  loadTuteurReports() {
    // Cette méthode devra être ajoutée dans le backend
    this.reportService.getReportsByTuteur(this.currentUser?.id as number).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.filterReports();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des rapports', err);
        this.error = 'Erreur lors de la récupération des rapports';
        this.isLoading = false;
      }
    });
  }

  filterReports() {
    this.pendingReports = this.reports.filter(r => !r.isApproved && !r.isRejected);
    this.approvedReports = this.reports.filter(r => r.isApproved);
    this.rejectedReports = this.reports.filter(r => r.isRejected);
  }

  viewReport(reportId: number) {
    if (!reportId) return;
    
    const backendUrl = "https://localhost:7110";
    const downloadUrl = `${backendUrl}/api/Pdf/getReport/${reportId}`;
    
    this.snackBar.open('Téléchargement du document...', '', {
      duration: 2000
    });
    
    this.http.get(downloadUrl, {
      responseType: 'blob' 
    }).subscribe({
      next: (data: Blob) => {
        const blobUrl = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
        const newWindow = window.open(blobUrl, '_blank');
        
        if (!newWindow) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `rapport-${reportId}.pdf`;
          link.click();
          window.URL.revokeObjectURL(blobUrl);
        }
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.snackBar.open('Erreur lors du téléchargement du document', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  openFeedbackForm(report: Report) {
    // Si on est dans la vue liste des stagiaires, on bascule sur la vue des rapports
    if (this.showStagiairesList) {
      this.showStagiairesList = false;
      
      // Si le rapport appartient à un stagiaire spécifique, chercher le stagiaire correspondant
      const stagiaireOfReport = this.stagiaires.find(s => 
        report.stagiaireId === s.id || 
        report.stagiaireName.includes(s.firstName) && report.stagiaireName.includes(s.lastName)
      );
      
      if (stagiaireOfReport) {
        this.selectedStagiaire = stagiaireOfReport;
      }
    }
    
    // Ensuite, sélectionner le rapport et afficher le formulaire
    this.selectedReport = report;
    this.feedbackForm.reset();
  }

  closeFeedbackForm() {
    this.selectedReport = null;
  }

  approveReport() {
    if (this.feedbackForm.invalid || !this.selectedReport || !this.currentUser) {
      return;
    }
    
    const approveData = {
      feedback: this.feedbackForm.value.feedback,
      approverId: this.currentUser.id
    };
    
    this.isLoading = true;
    
    this.reportService.approveReport(this.selectedReport.id, approveData).subscribe({
      next: (response) => {
        // Mettre à jour le rapport dans la liste
        const index = this.reports.findIndex(r => r.id === this.selectedReport!.id);
        if (index !== -1) {
          this.reports[index] = response;
          this.filterReports();
        }
        
        // Mettre à jour également la liste globale des rapports en attente
        const pendingIndex = this.allPendingReports.findIndex(r => r.id === this.selectedReport!.id);
        if (pendingIndex !== -1) {
          // Supprimer le rapport approuvé de la liste des rapports en attente
          this.allPendingReports.splice(pendingIndex, 1);
        }
        
        this.selectedReport = null;
        this.isLoading = false;
        
        this.snackBar.open('Rapport approuvé avec succès', 'Fermer', {
          duration: 3000
        });
        
        // Si on est de retour à la liste des stagiaires, recharger tous les rapports en attente
        if (this.showStagiairesList) {
          this.loadAllPendingReports();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur lors de l\'approbation du rapport', error);
        
        let errorMessage = 'Une erreur est survenue lors de l\'approbation du rapport';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.snackBar.open(errorMessage, 'Fermer', {
          duration: 5000
        });
      }
    });
  }

  getReportTypeName(reportType: string): string {
    switch (reportType) {
      case 'ConventionStage':
        return 'Convention de stage';
      case 'PlanTravail':
        return 'Plan de travail';
      case 'JournalBord':
        return 'Journal de bord';
      case 'BilanVersion1':
        return 'Bilan intermédiaire v1';
      case 'RestitutionOrale':
        return 'Restitution orale';
      case 'VisiteMiParcours':
        return 'Visite mi-parcours';
      case 'BilanVersion2':
        return 'Bilan intermédiaire v2';
      case 'RapportFinal':
        return 'Rapport final';
      default:
        return reportType;
    }
  }

  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }

  rejectReport() {
    if (this.feedbackForm.invalid || !this.selectedReport || !this.currentUser) {
      return;
    }
    
    const rejectData = {
      feedback: this.feedbackForm.value.feedback,
      approverId: this.currentUser.id
    };
    
    this.isLoading = true;
    
    this.reportService.rejectReport(this.selectedReport.id, rejectData).subscribe({
      next: (response) => {
        // Mettre à jour le rapport dans la liste
        const index = this.reports.findIndex(r => r.id === this.selectedReport!.id);
        if (index !== -1) {
          this.reports[index] = response;
          this.filterReports();
        }
        
        // Mettre à jour également la liste globale des rapports en attente
        const pendingIndex = this.allPendingReports.findIndex(r => r.id === this.selectedReport!.id);
        if (pendingIndex !== -1) {
          // Supprimer le rapport rejeté de la liste des rapports en attente
          this.allPendingReports.splice(pendingIndex, 1);
        }
        
        this.selectedReport = null;
        this.isLoading = false;
        
        this.snackBar.open('Rapport rejeté avec succès', 'Fermer', {
          duration: 3000
        });
        
        // Si on est de retour à la liste des stagiaires, recharger tous les rapports en attente
        if (this.showStagiairesList) {
          this.loadAllPendingReports();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur lors du rejet du rapport', error);
        
        let errorMessage = 'Une erreur est survenue lors du rejet du rapport';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.snackBar.open(errorMessage, 'Fermer', {
          duration: 5000
        });
      }
    });
  }



getStatusText(report: Report): string {
  if (report.isApproved) {
    return 'Approuvé';
  } else if (report.isRejected) {
    return 'Rejeté';
  } else {
    return 'En attente';
  }
}

getStatusClass(report: Report): string {
  if (report.isApproved) {
    return 'approved';
  } else if (report.isRejected) {
    return 'rejected';
  } else {
    return 'pending';
  }
}
get UserRole() {
  return UserRole;
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

applyFilter(event: Event) {
  const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
  
  if (!filterValue) {
    // Si le filtre est vide, afficher tous les rapports en attente
    this.allPendingReports = this.reports.filter(report => !report.isApproved && !report.isRejected);
  } else {
    // Filtrer les rapports par le nom du stagiaire
    this.allPendingReports = this.reports.filter(report => 
      !report.isApproved && !report.isRejected && 
      report.stagiaireName.toLowerCase().includes(filterValue)
    );
  }
}

}