// components/reports/timeline/timeline.component.ts - Version mise à jour
import { Component, OnInit } from '@angular/core';
import { ReportService } from '../../../services/Report/report.service';
import { ReportTypeService, ReportType } from '../../../services/Report/ReportType/report-type.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { Timeline, TimelineStep } from '../../models/Timeline';
import { Report } from '../../models/Report';
import { ReportUploadDialogComponent } from '../report-upload-dialog/report-upload-dialog.component';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { catchError, tap, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    SidebarComponent,
  ],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {
  isSidebarVisible = true;
  timeline: Timeline | null = null;
  currentUserId: number = 0;
  isLoading = true;
  error: string | null = null;
  
  // Pour l'affichage du temps restant
  today = new Date();
  
  // Rapports pour garder une référence aux données complètes
  reports: Report[] = [];
  
  // Types de rapports disponibles
  reportTypes: ReportType[] = [];
  
  // Map pour stocker les informations sur les approbateurs (id -> {nom, rôle})
  approvers: Map<number, { name: string, role: string }> = new Map();
  
  // Map pour stocker les commentaires de feedback (reportId -> feedback)
  reportFeedbacks: Map<number, string> = new Map();

  constructor(
    private reportService: ReportService,
    private reportTypeService: ReportTypeService,
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadReportTypes();
    this.loadUserInfo();
  }

  // Charger les types de rapports d'abord
  loadReportTypes(): void {
    this.reportTypeService.getActiveReportTypes().subscribe({
      next: (reportTypes) => {
        this.reportTypes = reportTypes;
        console.log('Types de rapports chargés:', reportTypes);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des types de rapports:', err);
        // Continuer même si les types ne sont pas chargés
      }
    });
  }

  loadUserInfo() {
    this.isLoading = true;
    
    if (this.authService.currentUserValue) {
      this.currentUserId = this.authService.currentUserValue.id;
      this.loadTimeline(this.currentUserId);
    } else {
      this.authService.currentUser.subscribe({
        next: (user) => {
          if (user) {
            this.currentUserId = user.id;
            this.loadTimeline(this.currentUserId);
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

  loadTimeline(stagiaireId: number) {
    // Charger d'abord la timeline
    this.reportService.getStagiaireTimeline(stagiaireId).subscribe({
      next: (timeline) => {
        this.timeline = timeline;
        
        // Enrichir les étapes avec les informations des types de rapports
        this.enrichTimelineSteps();
        
        // Ensuite, charger les détails des rapports pour les étapes complétées
        this.loadReportDetails();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de la timeline', err);
        this.error = 'Erreur lors de la récupération de la timeline';
        this.isLoading = false;
      }
    });
  }

  // Enrichir les étapes avec les informations des types de rapports
  enrichTimelineSteps(): void {
    if (!this.timeline || !this.timeline.steps) return;

    this.timeline.steps.forEach(step => {
      // Chercher le type de rapport correspondant
      let reportType: ReportType | undefined;
      
      // Méthode 1: Chercher par ID si disponible
      if (step.reportTypeId) {
        reportType = this.reportTypes.find(rt => rt.id === step.reportTypeId);
      }
      
      // Méthode 2: Chercher par nom si pas trouvé par ID
      if (!reportType && step.reportType) {
        reportType = this.reportTypes.find(rt => 
          rt.name === step.reportType || 
          rt.name.toLowerCase().includes(step.reportType.toLowerCase())
        );
      }
      
      // Mettre à jour les informations du step avec celles du type
      if (reportType) {
        step.iconClass = reportType.iconClass;
        step.reportTypeColor = reportType.color;
        step.reportTypeName = reportType.name;
        step.reportTypeDescription = reportType.description;
        step.isAutoGenerated = reportType.isAutoGenerated;
        step.reportTypeId = reportType.id;
      } else {
        // Valeurs par défaut si le type n'est pas trouvé
        step.iconClass = step.iconClass || 'fa-file';
        step.reportTypeColor = '#007bff';
        step.reportTypeName = step.reportType;
      }
    });
  }
  
  // Méthode pour charger les détails des rapports
  loadReportDetails() {
    if (!this.timeline || !this.timeline.steps) {
      this.isLoading = false;
      return;
    }
    
    // Filtrer les étapes qui ont un reportId
    const completedSteps = this.timeline.steps.filter(step => step.reportId);
    
    if (completedSteps.length === 0) {
      this.isLoading = false;
      return;
    }
    
    // Créer un tableau de requêtes pour tous les rapports
    const reportRequests = completedSteps.map(step => {
      if (step.reportId) {
        return this.reportService.getReportById(step.reportId).pipe(
          catchError(error => {
            console.error(`Erreur lors du chargement du rapport ${step.reportId}:`, error);
            return of(null);
          })
        );
      }
      return of(null);
    });
    
    // Exécuter toutes les requêtes en parallèle
    forkJoin(reportRequests).subscribe({
      next: (reportsData: (Report | null)[]) => {
        // Stocker tous les rapports pour référence ultérieure
        this.reports = reportsData.filter((report): report is Report => !!report) as Report[];
        
        // Pour chaque rapport récupéré, mettre à jour les informations des étapes
        reportsData.forEach((report, index) => {
          if (report && completedSteps[index]) {
            const stepIndex = this.timeline!.steps.findIndex(s => s.reportId === completedSteps[index].reportId);
            
            if (stepIndex !== -1) {
              const step = this.timeline!.steps[stepIndex];
              
              // Ajouter l'état d'approbation au step
              step.isApproved = report.isApproved || false;
              step.isRejected = report.isRejected || false;
              step.isPending = !report.isApproved && !report.isRejected;
              
              // Stocker la date de soumission
              step.submissionDate = new Date(report.submissionDate);
              
              // Enrichir avec les informations du type de rapport
              if (report.reportTypeId && report.reportTypeName) {
                step.reportTypeId = report.reportTypeId;
                step.reportTypeName = report.reportTypeName;
                step.reportTypeDescription = report.reportTypeDescription;
                step.iconClass = report.reportTypeIconClass || step.iconClass;
                step.reportTypeColor = report.reportTypeColor || step.reportTypeColor;
                step.isAutoGenerated = report.isAutoGenerated;
              }
              
              if (report.approverId) {
                step.approverId = report.approverId;
                
                // Si l'approverName est déjà fourni, l'utiliser
                if (report.approverName) {
                  this.approvers.set(report.approverId, {
                    name: report.approverName,
                    role: 'Validateur'
                  });
                } else {
                  // Sinon charger les infos de l'approbateur
                  this.loadApproverInfo(report.approverId);
                }
              }
              
              // Ajouter les commentaires de feedback s'ils existent
              if (report.feedbackComments) {
                step.feedbackComments = report.feedbackComments;
                this.reportFeedbacks.set(report.id, report.feedbackComments);
              }
            }
          }
        });
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails des rapports', err);
        this.isLoading = false;
      }
    });
  }
  
  // Méthode pour charger les informations sur l'approbateur
  loadApproverInfo(approverId: number) {
    if (this.approvers.has(approverId)) {
      return; // Déjà chargé
    }
    
    this.userService.getUserById(approverId).subscribe({
      next: (user) => {
        if (user) {
          this.approvers.set(approverId, {
            name: `${user.firstName} ${user.lastName}`,
            role: typeof user.role === 'number' ? this.getRoleName(user.role) : user.role
          });
        }
      },
      error: (err) => {
        console.error(`Erreur lors du chargement de l'approbateur ${approverId}:`, err);
      }
    });
  }
  
  // Aide à convertir l'ID du rôle en nom
  getRoleName(roleId: number): string {
    switch(roleId) {
      case 1: return 'Admin';
      case 2: return 'RH';
      case 3: return 'Tuteur';
      case 4: return 'Stagiaire';
      default: return 'Utilisateur';
    }
  }

  openUploadDialog(step: TimelineStep) {
    // Déterminer s'il s'agit d'une re-soumission
    const isResubmission = step.isRejected && step.reportId;
    const rejectedReportId = isResubmission ? step.reportId : undefined;
    
    // Utiliser reportTypeId si disponible, sinon essayer de le trouver
    let reportTypeId = step.reportTypeId;
    
    if (!reportTypeId && step.reportType) {
      // Chercher l'ID par le nom
      const reportType = this.reportTypes.find(rt => 
        rt.name === step.reportTypeName || 
        rt.name.toLowerCase().includes(step.reportType.toLowerCase())
      );
      reportTypeId = reportType?.id;
    }
    
    if (!reportTypeId) {
      this.snackBar.open('Type de rapport non trouvé. Veuillez contacter l\'administrateur.', 'Fermer', {
        duration: 5000
      });
      return;
    }
    
    const dialogRef = this.dialog.open(ReportUploadDialogComponent, {
      width: '500px',
      data: {
        stagiaireId: this.currentUserId,
        reportTypeId: reportTypeId, // Nouveau: passer l'ID
        reportTypeName: step.reportTypeName || step.name, // Pour l'affichage
        stepName: step.name,
        isResubmission: isResubmission,
        rejectedReportId: rejectedReportId
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Attendre avant de rafraîchir pour s'assurer que le backend a traité la demande
        this.isLoading = true;
        
        // Nettoyer les données en cache
        this.reports = [];
        this.reportFeedbacks.clear();
        this.approvers.clear();
        
        // Recharger complètement la timeline
        setTimeout(() => {
          this.loadTimeline(this.currentUserId);
          
          this.snackBar.open('Rapport envoyé avec succès!', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
        }, 1000);
      }
    });
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

  getRemainingDays(dateStr: Date): number {
    const targetDate = new Date(dateStr);
    const diff = targetDate.getTime() - this.today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  getStatusClass(step: TimelineStep): string {
    if (step.isRejected) return 'rejected';
    if (step.isApproved) return 'approved';
    if (step.isCompleted && !step.isApproved && !step.isRejected) return 'pending-approval';
    if (step.isCompleted) return 'completed';
    if (step.isCurrent) return 'current';
    return 'upcoming';
  }

  getStatusText(step: TimelineStep): string {
    if (step.isRejected) return 'Rejeté';
    if (step.isApproved) return 'Approuvé';
    if (step.isCompleted && !step.isApproved && !step.isRejected) return 'En attente d\'approbation';
    
    const remainingDays = this.getRemainingDays(step.date);
    
    if (remainingDays < 0) {
      return 'En retard';
    } else if (remainingDays === 0) {
      return 'Aujourd\'hui';
    } else if (remainingDays === 1) {
      return 'Demain';
    } else {
      return `Dans ${remainingDays} jours`;
    }
  }
  
  // Méthode pour obtenir le feedback d'un rapport
  getFeedback(reportId?: number): string | null {
    if (!reportId) return null;
    
    // D'abord vérifier dans la Map
    const feedback = this.reportFeedbacks.get(reportId);
    if (feedback) return feedback;
    
    // Ensuite vérifier dans les steps de la timeline
    const step = this.timeline?.steps.find(s => s.reportId === reportId);
    if (step && step.feedbackComments) return step.feedbackComments;
    
    // Enfin, vérifier dans les rapports
    const report = this.reports.find(r => r.id === reportId);
    if (report && report.feedbackComments) return report.feedbackComments;
    
    return null;
  }
  
  // Méthode pour obtenir les informations sur l'approbateur
  getApproverInfo(step: TimelineStep): string | null {
    if (!step.reportId || (!step.isApproved && !step.isRejected)) return null;
    
    // Utiliser step.approverId si disponible
    if (step.approverId) {
      const approver = this.approvers.get(step.approverId);
      if (approver) {
        return `${approver.name} (${approver.role})`;
      }
    }
    
    // Alternative: chercher dans this.reports si nécessaire
    const report = this.reports.find(r => r.id === step.reportId);
    if (!report) return null;
    
    // Si approverName est disponible directement dans le rapport
    if (report.approverName) {
      return `${report.approverName} (Validateur)`;
    }
    
    // Sinon, vérifier si approverId est disponible et mappé
    if (report.approverId) {
      const approver = this.approvers.get(report.approverId);
      if (approver) {
        return `${approver.name} (${approver.role})`;
      }
    }
    
    return null;
  }

  // Obtenir le nom d'affichage d'un type de rapport
  getReportTypeName(step: TimelineStep): string {
    // Priorité 1: Nom du type de rapport enrichi
    if (step.reportTypeName) {
      return step.reportTypeName;
    }
    
    // Priorité 2: Chercher dans les types chargés
    if (step.reportTypeId) {
      const reportType = this.reportTypes.find(rt => rt.id === step.reportTypeId);
      if (reportType) {
        return reportType.name;
      }
    }
    
    // Priorité 3: Utiliser le nom de l'étape ou le type legacy
    return step.name || step.reportType || 'Type inconnu';
  }

  // Obtenir la couleur d'un type de rapport
  getReportTypeColor(step: TimelineStep): string {
    return step.reportTypeColor || '#007bff';
  }

  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
}

// Extension de l'interface TimelineStep pour les nouvelles propriétés
declare module '../../models/Timeline' {
  interface TimelineStep {
    reportTypeId?: number;
    reportTypeName?: string;
    reportTypeDescription?: string;
    reportTypeColor?: string;
    isAutoGenerated?: boolean;
  }
}