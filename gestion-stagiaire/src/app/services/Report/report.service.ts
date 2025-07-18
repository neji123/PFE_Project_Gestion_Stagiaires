// services/Report/report.service.ts - Version mise à jour
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Report, ReportUpload, ReportResubmit, ReportTypeMapper } from '../../components/models/Report';
import { Timeline } from '../../components/models/Timeline';
import { ApproveReport } from '../../components/models/ApproveReport';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/api/reports`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Headers HTTP avec token d'authentification
  public getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  // Téléversement d'un rapport avec le nouveau système
  uploadReport(reportData: ReportUpload): Observable<Report> {
    const formData = new FormData();
    formData.append('stagiaireId', reportData.stagiaireId.toString());
    formData.append('reportTypeId', reportData.reportTypeId.toString()); // Nouveau: ID au lieu de string
    formData.append('title', reportData.title);
    formData.append('description', reportData.description || '');
    formData.append('file', reportData.file);

    return this.http.post<Report>(`${this.apiUrl}/upload`, formData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapReportToDto(response)),
      tap(response => console.log('Report uploaded successfully:', response)),
      catchError(this.handleError)
    );
  }

  // Re-soumission d'un rapport avec le nouveau système
  resubmitReport(reportData: ReportResubmit): Observable<Report> {
    const formData = new FormData();
    formData.append('stagiaireId', reportData.stagiaireId.toString());
    formData.append('reportTypeId', reportData.reportTypeId.toString()); // Nouveau: ID au lieu de string
    formData.append('title', reportData.title);
    formData.append('description', reportData.description || '');
    formData.append('file', reportData.file);
    formData.append('rejectedReportId', reportData.rejectedReportId.toString());

    return this.http.post<Report>(`${this.apiUrl}/resubmit`, formData, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapReportToDto(response)),
      tap(response => console.log('Report resubmitted successfully:', response)),
      catchError(this.handleError)
    );
  }

  // Obtenir un rapport par ID
  getReportById(id: number): Observable<Report> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => this.mapReportToDto(response)),
      catchError(this.handleError)
    );
  }

  // Obtenir tous les rapports d'un stagiaire
  getReportsByStagiaire(stagiaireId: number): Observable<Report[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stagiaire/${stagiaireId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(reports => reports.map(report => this.mapReportToDto(report))),
      catchError(this.handleError)
    );
  }

  // Obtenir tous les rapports
  getAllReports(): Observable<Report[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`, {
      headers: this.getHeaders()
    }).pipe(
      map(reports => reports.map(report => this.mapReportToDto(report))),
      catchError(this.handleError)
    );
  }

  // Obtenir les rapports par tuteur
  getReportsByTuteur(tuteurId: number): Observable<Report[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tuteur/${tuteurId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(reports => reports.map(report => this.mapReportToDto(report))),
      catchError(this.handleError)
    );
  }

  // Approuver un rapport
  approveReport(reportId: number, approveData: ApproveReport): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/${reportId}/approve`, approveData, {
      headers: this.getHeaders().set('Content-Type', 'application/json')
    }).pipe(
      map(response => this.mapReportToDto(response)),
      catchError(this.handleError)
    );
  }

  // Rejeter un rapport
  rejectReport(reportId: number, rejectData: ApproveReport): Observable<Report> {
    return this.http.post<Report>(`${this.apiUrl}/${reportId}/reject`, rejectData, {
      headers: this.getHeaders().set('Content-Type', 'application/json')
    }).pipe(
      map(response => this.mapReportToDto(response)),
      catchError(this.handleError)
    );
  }

  // Obtenir la timeline d'un stagiaire avec les nouveaux types
  getStagiaireTimeline(stagiaireId: number): Observable<Timeline> {
    return this.http.get<Timeline>(`${this.apiUrl}/timeline/${stagiaireId}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(timeline => {
        // Convertir les chaînes de date en objets Date et traiter les nouveaux champs
        timeline.steps.forEach(step => {
          step.date = new Date(step.date);
          
          // Mettre à jour l'iconClass si ce n'est pas défini (pour la compatibilité)
          if (!step.iconClass) {
            step.iconClass = this.getDefaultIconForReportType(step.reportType);
          }
        });
      }),
      catchError(this.handleError)
    );
  }

  // Supprimer un rapport
  deleteReport(reportId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${reportId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Télécharger un rapport
  downloadReport(reportId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reportId}/download`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Statistiques des rapports pour un stagiaire
  getReportStatistics(stagiaireId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stagiaire/${stagiaireId}/statistics`, {
      headers: this.getHeaders()
    }).pipe(
      map(stats => ({
        totalReports: stats.totalReports || 0,
        approvedReports: stats.approvedReports || 0,
        rejectedReports: stats.rejectedReports || 0,
        pendingReports: stats.pendingReports || 0,
        averageApprovalTime: stats.averageApprovalTime || 0
      })),
      catchError(error => {
        console.error('Erreur lors de la récupération des statistiques des rapports:', error);
        // Calculer les stats à partir des rapports existants en cas d'erreur
        return this.getReportsByStagiaire(stagiaireId).pipe(
          map(reports => ({
            totalReports: reports.length,
            approvedReports: reports.filter(r => r.isApproved).length,
            rejectedReports: reports.filter(r => r.isRejected).length,
            pendingReports: reports.filter(r => !r.isApproved && !r.isRejected).length,
            averageApprovalTime: 0
          }))
        );
      })
    );
  }

  // Mapper la réponse du serveur vers le DTO avec le nouveau système
  private mapReportToDto(report: any): Report {
    // Construire l'URL correcte vers le fichier
    const backendUrl = environment.apiUrl;
    let downloadUrl = report.downloadUrl;
    if (downloadUrl && !downloadUrl.startsWith('http')) {
      downloadUrl = downloadUrl.replace('localhost:4200', 'localhost:7110');
      if (!downloadUrl.startsWith('/')) {
        downloadUrl = '/' + downloadUrl;
      }
      downloadUrl = backendUrl + downloadUrl;
    }

    return {
      id: report.id,
      title: report.title,
      description: report.description,
      submissionDate: new Date(report.submissionDate),
      dueDate: report.dueDate ? new Date(report.dueDate) : undefined,
      isSubmitted: report.isSubmitted,
      isApproved: report.isApproved,
      isRejected: report.isRejected,
      feedbackComments: report.feedbackComments,
      status: report.status || 'Actif',
      
      // Nouveau système avec types dynamiques
      reportTypeId: report.reportTypeId,
      reportTypeName: report.reportTypeName || this.getLegacyReportTypeName(report.reportType),
      reportTypeDescription: report.reportTypeDescription,
      reportTypeIconClass: report.reportTypeIconClass || this.getDefaultIconForReportType(report.reportTypeName || report.reportType),
      reportTypeColor: report.reportTypeColor || '#007bff',
      isAutoGenerated: report.isAutoGenerated || false,
      
      // Informations du stagiaire et approbateur
      stagiaireId: report.stagiaireId,
      stagiaireName: report.stagiaireName,
      approverId: report.approverId,
      approverName: report.approverName,
      
      downloadUrl: downloadUrl || '',
      stageTimelineId: report.stageTimelineId,
      createdAt: new Date(report.createdAt || report.submissionDate),
      updatedAt: report.updatedAt ? new Date(report.updatedAt) : undefined
    };
  }

  // Méthode de compatibilité pour obtenir le nom d'affichage des anciens types
  private getLegacyReportTypeName(reportType: string): string {
    if (!reportType) return '';
    
    // Si c'est un ancien nom d'enum, le convertir
    return ReportTypeMapper.getDisplayName(reportType);
  }

  // Obtenir l'icône par défaut pour un type de rapport
  private getDefaultIconForReportType(reportTypeName: string): string {
    if (!reportTypeName) return 'fa-file';
    
    const iconMapping: { [key: string]: string } = {
      'Convention de stage': 'fa-file-contract',
      'ConventionStage': 'fa-file-contract',
      'Dépôt document métier': 'fa-briefcase',
      'Plan de travail': 'fa-tasks',
      'PlanTravail': 'fa-tasks',
      'Les diagrammes': 'fa-project-diagram',
      'Les maquettes': 'fa-palette',
      'Journal de bord': 'fa-book',
      'JournalBord': 'fa-book',
      'Présentation mi-terme': 'fa-presentation',
      'RestitutionOrale': 'fa-presentation',
      'Captures d\'interfaces': 'fa-camera',
      'Rapport final': 'fa-file-pdf',
      'RapportFinal': 'fa-file-pdf',
      'Présentation finale': 'fa-chalkboard-teacher'
    };

    // Chercher une correspondance exacte d'abord
    if (iconMapping[reportTypeName]) {
      return iconMapping[reportTypeName];
    }

    // Chercher une correspondance partielle
    for (const [key, icon] of Object.entries(iconMapping)) {
      if (reportTypeName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(reportTypeName.toLowerCase())) {
        return icon;
      }
    }

    return 'fa-file'; // Icône par défaut
  }

  // Gestion d'erreur générique
  private handleError(error: any) {
    console.error('Une erreur s\'est produite dans ReportService', error);
    return throwError(() => error);
  }

  /**
   * Méthodes utilitaires pour la migration
   */

  // Obtenir le nom d'affichage d'un type de rapport
  getReportTypeName(reportTypeId: number, reportTypeName?: string): string {
    if (reportTypeName) {
      return reportTypeName;
    }
    
    // Si on n'a pas le nom, essayer de le trouver via le service ReportType
    // Cette méthode peut être appelée après injection du ReportTypeService
    return `Type ${reportTypeId}`;
  }

  // Méthode temporaire pour la compatibilité avec l'ancien code
  getReportTypeNameLegacy(reportType: string): string {
    return this.getLegacyReportTypeName(reportType);
  }
}