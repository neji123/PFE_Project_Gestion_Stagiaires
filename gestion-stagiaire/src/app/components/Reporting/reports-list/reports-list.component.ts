// components/reports/reports-list/reports-list.component.ts - Version mise à jour
import { Component, OnInit } from '@angular/core';
import { ReportService } from '../../../services/Report/report.service';
import { ReportTypeService, ReportType } from '../../../services/Report/ReportType/report-type.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { Report } from '../../models/Report';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
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
import { MatTableModule } from '@angular/material/table';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule,
    SidebarComponent
  ],
  templateUrl: './reports-list.component.html',
  styleUrls: ['./reports-list.component.scss']
})
export class ReportsListComponent implements OnInit {
  isSidebarVisible = true;
  reports: Report[] = [];
  reportTypes: ReportType[] = [];
  isLoading = true;
  error: string | null = null;
  currentUserId: number = 0;
  displayedColumns: string[] = ['title', 'reportType', 'submissionDate', 'status', 'actions'];

  constructor(
    private reportService: ReportService,
    private reportTypeService: ReportTypeService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadReportTypes();
    this.loadUserInfo();
  }

  // Charger les types de rapports
  loadReportTypes(): void {
    this.reportTypeService.getActiveReportTypes().subscribe({
      next: (reportTypes) => {
        this.reportTypes = reportTypes;
        console.log('Types de rapports chargés:', reportTypes);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des types de rapports:', err);
        // Continuer même si les types ne sont pas chargés pour compatibilité
      }
    });
  }

  loadUserInfo() {
    this.isLoading = true;
    
    if (this.authService.currentUserValue) {
      this.currentUserId = this.authService.currentUserValue.id;
      this.loadReports(this.currentUserId);
    } else {
      this.authService.currentUser.subscribe({
        next: (user) => {
          if (user) {
            this.currentUserId = user.id;
            this.loadReports(this.currentUserId);
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

  loadReports(stagiaireId: number) {
    this.reportService.getReportsByStagiaire(stagiaireId).subscribe({
      next: (reports) => {
        this.reports = reports;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des rapports', err);
        this.error = 'Erreur lors de la récupération des rapports';
        this.isLoading = false;
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

  deleteReport(reportId: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmation de suppression',
        message: 'Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est irréversible.',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reportService.deleteReport(reportId).subscribe({
          next: () => {
            this.loadReports(this.currentUserId);
            this.snackBar.open('Rapport supprimé avec succès', 'Fermer', {
              duration: 3000
            });
          },
          error: (err) => {
            console.error('Erreur lors de la suppression du rapport', err);
            this.snackBar.open('Erreur lors de la suppression du rapport', 'Fermer', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  replaceReport(report: Report) {
    // Utiliser les propriétés du nouveau système
    let reportTypeId = report.reportTypeId;
    let reportTypeName = report.reportTypeName;

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
        reportTypeId: reportTypeId,
        reportTypeName: reportTypeName || this.getReportTypeName(report),
        stepName: reportTypeName || this.getReportTypeName(report),
        isResubmission: false // C'est un remplacement, pas une re-soumission
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadReports(this.currentUserId);
        this.snackBar.open('Rapport remplacé avec succès', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  // Méthode mise à jour pour obtenir le nom du type de rapport
  getReportTypeName(report: Report): string {
    // Priorité 1: Nouveau système avec reportTypeName
    if (report.reportTypeName) {
      return report.reportTypeName;
    }

    // Priorité 2: Chercher dans les types chargés par reportTypeId
    if (report.reportTypeId) {
      const reportType = this.reportTypes.find(rt => rt.id === report.reportTypeId);
      if (reportType) {
        return reportType.name;
      }
      // Si on ne trouve pas le type, afficher l'ID
      return `Type ${report.reportTypeId}`;
    }

    return 'Type inconnu';
  }

  // Obtenir l'icône d'un type de rapport
  getReportTypeIcon(report: Report): string {
    // Priorité 1: Icône du nouveau système
    if (report.reportTypeIconClass) {
      return report.reportTypeIconClass;
    }

    // Priorité 2: Chercher dans les types chargés
    if (report.reportTypeId) {
      const reportType = this.reportTypes.find(rt => rt.id === report.reportTypeId);
      if (reportType) {
        return reportType.iconClass;
      }
    }

    return 'fa-file'; // Icône par défaut
  }

  // Obtenir la couleur d'un type de rapport
  getReportTypeColor(report: Report): string {
    // Priorité 1: Couleur du nouveau système
    if (report.reportTypeColor) {
      return report.reportTypeColor;
    }

    // Priorité 2: Chercher dans les types chargés
    if (report.reportTypeId) {
      const reportType = this.reportTypes.find(rt => rt.id === report.reportTypeId);
      if (reportType) {
        return reportType.color;
      }
    }

    return '#007bff'; // Couleur par défaut
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

  getStatusText(report: Report): string {
    if (report.isApproved) {
      return 'Approuvé';
    } else if (report.isRejected) {
      return 'Rejeté';
    } else {
      return 'En attente';
    }
  }

  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }

  // Vérifier si un rapport utilise le nouveau système
  isNewSystemReport(report: Report): boolean {
    return !!(report.reportTypeId && report.reportTypeName);
  }

  // Obtenir des informations complètes sur le type de rapport
  getReportTypeInfo(report: Report): { name: string; icon: string; color: string; isComplete: boolean } {
    return {
      name: this.getReportTypeName(report),
      icon: this.getReportTypeIcon(report),
      color: this.getReportTypeColor(report),
      isComplete: this.isNewSystemReport(report)
    };
  }

  // Méthode pour rafraîchir la liste des rapports
  refreshReports(): void {
    this.isLoading = true;
    this.loadReports(this.currentUserId);
  }

  // Méthode pour obtenir le tooltip d'un rapport
  getReportTooltip(report: Report): string {
    const typeInfo = this.getReportTypeInfo(report);
    let tooltip = `Type: ${typeInfo.name}`;
    
    if (report.description) {
      tooltip += `\nDescription: ${report.description}`;
    }
    
    if (!typeInfo.isComplete) {
      tooltip += '\n(Informations de type incomplètes)';
    }
    
    return tooltip;
  }
}