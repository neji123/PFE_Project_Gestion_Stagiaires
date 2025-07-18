// statistics.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private apiUrl = `${environment.apiUrl}/api/statistics`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  
  // Headers HTTP avec token d'authentification
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  /**
   * Récupère la distribution des stagiaires par département
   */
  getDepartmentDistribution(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/department-distribution`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('Erreur lors de la récupération de la distribution par département', error);
          // Données temporaires en cas d'erreur
          return of([
            { name: 'Développement', value: 8 },
            { name: 'Design', value: 5 },
            { name: 'Marketing', value: 3 },
            { name: 'Finance', value: 2 }
          ]);
        })
      );
  }

  /**
   * Récupère les statistiques des stages par mois
   */
  getStageStatistics(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stage-statistics`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('Erreur lors de la récupération des statistiques des stages', error);
          // Données temporaires en cas d'erreur
          return of([
            { name: 'Jan', completed: 4, pending: 2 },
            { name: 'Fév', completed: 3, pending: 1 },
            { name: 'Mar', completed: 5, pending: 3 },
            { name: 'Avr', completed: 7, pending: 2 },
            { name: 'Mai', completed: 6, pending: 4 }
          ]);
        })
      );
  }

  /**
   * Récupère les activités récentes
   */
  getRecentActivities(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent-activities`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('Erreur lors de la récupération des activités récentes', error);
          // Données temporaires en cas d'erreur
          return of([
            { text: "Nouveau stagiaire inscrit", time: "Il y a 2 heures", type: "user" },
            { text: "Rapport validé par Tuteur", time: "Il y a 5 heures", type: "completion" },
            { text: "Nouveau tuteur ajouté", time: "Il y a 1 jour", type: "user" },
            { text: "Mise à jour département", time: "Il y a 2 jours", type: "notification" }
          ]);
        })
      );
  }

 

  /**
 * Récupère la distribution des stagiaires par type de stage (été vs PFE)
 */
getStageTypeDistribution(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/stage-type-distribution`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération de la distribution par type de stage', error);
        // Données temporaires en cas d'erreur
        return of([
          { name: 'Stage PFE', value: 65 },
          { name: 'Stage d\'été', value: 30 },
          { name: 'Non spécifié', value: 5 }
        ]);
      })
    );
}

/**
 * Récupère la distribution des stagiaires par niveau d'études
 */
getEducationLevelDistribution(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/education-level-distribution`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération de la distribution par niveau d\'études', error);
        // Données temporaires en cas d'erreur
        return of([
          { name: 'Ingénierie', value: 45 },
          { name: 'Licence', value: 25 },
          { name: 'Master', value: 20 },
          { name: 'Non spécifié', value: 10 }
        ]);
      })
    );
}

/**
 * Récupère la distribution des stagiaires par université
 */
getUniversityDistribution(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/university-distribution`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération de la distribution par université', error);
        // Données temporaires en cas d'erreur
        return of([
          { name: 'Université de Tunis', value: 35 },
          { name: 'Université de Carthage', value: 25 },
          { name: 'Université de Sousse', value: 20 },
          { name: 'Autres universités', value: 15 },
          { name: 'Non spécifié', value: 5 }
        ]);
      })
    );
}

/**
 * Récupère la distribution croisée université par département
 */
getUniversityByDepartment(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/university-by-department`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération de la distribution université par département', error);
        // Données temporaires en cas d'erreur
        return of([
          {
            department: 'Développement',
            universities: [
              { university: 'Université de Tunis', count: 12 },
              { university: 'Université de Carthage', count: 8 }
            ]
          },
          {
            department: 'Design',
            universities: [
              { university: 'Université de Tunis', count: 5 },
              { university: 'Université de Sousse', count: 7 }
            ]
          }
        ]);
      })
    );
}

/**
 * Récupère la liste des stagiaires dont le stage se termine bientôt
 * @param days Nombre de jours à considérer (défaut: 30)
 */
getStagiairesEndingSoon(days: number = 30): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/ending-soon?days=${days}`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération des stagiaires terminant bientôt', error);
        // Données temporaires en cas d'erreur
        const today = new Date();
        return of([
          {
            id: 1,
            firstName: 'Mohamed',
            lastName: 'Ben Ali',
            endDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
            daysLeft: 15,
            department: 'Développement',
            university: 'Université de Tunis',
            stageType: 'stage_pfe',
            educationLevel: 'ingénierie'
          },
          {
            id: 2,
            firstName: 'Fatma',
            lastName: 'Trabelsi',
            endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
            daysLeft: 7,
            department: 'Marketing',
            university: 'Université de Carthage',
            stageType: 'stage_été',
            educationLevel: 'licence'
          }
        ]);
      })
    );
}

/**
 * Récupère les KPIs généraux pour le dashboard RH
 */
getRHKPIs(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/rh-kpis`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération des KPIs RH', error);
        // Données temporaires en cas d'erreur
        return of({
          totalStagiaires: 100,
          activeStagiaires: 85,
          totalTuteurs: 20,
          activeTuteurs: 18,
          stagiairesSansTuteur: 5,
          stagePFE: 65,
          stageEte: 35,
          ingenierie: 45,
          licence: 30,
          master: 25,
          finissantCeMois: 15,
          nouveauxCeMois: 10,
          stagiairesSansDocuments: 8,
          tuteurMaxStagiaires: 8,
          tuteurMinStagiaires: 2,
          tuteurMoyenneStagiaires: 5
        });
      })
    );
}

/**
 * Récupère la distribution mensuelle des débuts et fins de stage
 */
getMonthlyStageDistribution(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/monthly-stage-distribution`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.log('Erreur lors de la récupération de la distribution mensuelle des stages', error);
        // Données temporaires en cas d'erreur
        return of([
          { month: 'Fév 2025', starting: 5, ending: 2 },
          { month: 'Mar 2025', starting: 3, ending: 8 },
          { month: 'Avr 2025', starting: 7, ending: 5 },
          { month: 'Mai 2025', starting: 10, ending: 3 },
          { month: 'Juin 2025', starting: 15, ending: 7 },
          { month: 'Juil 2025', starting: 8, ending: 12 },
          { month: 'Août 2025', starting: 4, ending: 18 },
          { month: 'Sep 2025', starting: 2, ending: 6 }
        ]);
      })
    );
}

// Dans StatisticsService (paste-3.txt), supprimez les données statiques
// Dans StatisticsService - Ajoutez/modifiez cette méthode
getDashboardStatistics(role: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/dashboard/${role}`, { headers: this.getHeaders() })
    .pipe(
      map(response => {
        // Mapper la réponse selon le rôle
        switch (role.toLowerCase()) {
          case 'stagiaire':
            return {
              daysRemaining: response.remainingDays || 0,
              submittedDocs: response.submittedDocs || 0,
              completedTasks: response.completedTasks || 0,
              pendingTasks: response.pendingTasks || 0
            };
          case 'tuteur':
            return {
              stagiairesCount: response.stagiairesCount || 0,
              pendingReports: response.pendingReports || 0,
              completedTasks: response.completedTasks || 0,
              messages: response.messages || 0
            };
          case 'rh':
            return {
              activeStages: response.activeStages || 0,
              activeTuteurs: response.activeTuteurs || 0,
              pendingAccounts: response.pendingAccounts || 0,
              validatedDocuments: response.validatedDocuments || 0
            };
          case 'admin':
            return {
              totalUsers: response.totalUsers || 0,
              tuteurs: response.tuteurs || 0,
              stagiaires: response.stagiaires || 0,
              newRequests: response.newRequests || 0
            };
          default:
            return response;
        }
      }),
      catchError(error => {
        console.error(`Erreur lors de la récupération des statistiques du dashboard ${role}`, error);
        
        // Données par défaut selon le rôle en cas d'erreur
        switch (role.toLowerCase()) {
          case 'stagiaire':
            return of({
              daysRemaining: 45,
              submittedDocs: 0,
              completedTasks: 0,
              pendingTasks: 0
            });
          case 'tuteur':
            return of({
              stagiairesCount: 0,
              pendingReports: 0,
              completedTasks: 0,
              messages: 0
            });
          case 'rh':
            return of({
              activeStages: 0,
              activeTuteurs: 0,
              pendingAccounts: 0,
              validatedDocuments: 0
            });
          case 'admin':
            return of({
              totalUsers: 0,
              tuteurs: 0,
              stagiaires: 0,
              newRequests: 0
            });
          default:
            return of({});
        }
      })
    );
}

}