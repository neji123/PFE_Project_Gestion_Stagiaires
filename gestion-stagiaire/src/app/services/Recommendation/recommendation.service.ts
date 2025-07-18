import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError,map } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

// Interfaces pour les recommandations
export interface StagiaireRecommendation {
  stagiaireId: number;
  name: string;
  email: string;
  skills: string;
  department: string;
  university: string;
  stagePeriod: string;
  rating: number;
  compositeScore: number;
  textSimilarity: number;
  skillSimilarity: number;
  departmentMatch: boolean;
  matchReasons: string[];
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: StagiaireRecommendation[];
  totalFound: number;
  error?: string;
}

export interface GenerateRecommendationsRequest {
  jobOfferId: number;
  topN?: number;
  regenerateIfExists?: boolean;
}

export interface JobOfferWithRecommendations {
  id: number;
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
  departmentName: string;
  publishedAt: Date;
  recommendationsGenerated: boolean;
  lastRecommendationGeneratedAt?: Date;
  recommendationCount: number;
  recommendations: StagiaireRecommendationDto[];
}

export interface StagiaireRecommendationDto {
  id: number;
  stagiaireId: number;
  stagiaireEmail: string;
  stagiaireName: string;
  skills: string;
  department: string;
  university: string;
  compositeScore: number;
  skillSimilarity: number;
  textSimilarity: number;
  departmentMatch: boolean;
  recommendationRank: number;
  matchReasons: string[];
  generatedAt: Date;
  isViewed: boolean;
  isContacted: boolean;
  isSelected: boolean;
  notes?: string;
}

export interface UpdateRecommendationStatusRequest {
  recommendationId: number;
  isViewed?: boolean;
  isContacted?: boolean;
  isSelected?: boolean;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = `${environment.apiUrl}/api/jobofferrecommendation`;
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

  private handleError(error: any) {
    console.error('❌ Erreur dans RecommendationService:', error);
    return throwError(() => error);
  }

  /**
   * 🎯 Génère des recommandations IA pour une offre d'emploi
   */
  generateRecommendations(request: GenerateRecommendationsRequest): Observable<RecommendationResponse> {
    console.log('🤖 Génération de recommandations IA pour JobOffer:', request.jobOfferId);
    
    return this.http.post<RecommendationResponse>(`${this.apiUrl}/generate`, request, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log(`✅ ${response.totalFound} recommandations générées`);
          } else {
            console.log('⚠️ Erreur lors de la génération:', response.error);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * 📋 Récupère une offre d'emploi avec ses recommandations
   */
  getJobOfferWithRecommendations(jobOfferId: number): Observable<JobOfferWithRecommendations> {
    console.log('📋 Récupération de l\'offre avec recommandations:', jobOfferId);
    
    return this.http.get<JobOfferWithRecommendations>(`${this.apiUrl}/job-offer/${jobOfferId}`, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(jobOffer => {
          console.log(`📊 Offre récupérée: ${jobOffer.recommendationCount} recommandations`);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * ✏️ Met à jour le statut d'une recommandation
   */
  updateRecommendationStatus(request: UpdateRecommendationStatusRequest): Observable<StagiaireRecommendationDto> {
    console.log('✏️ Mise à jour du statut de la recommandation:', request.recommendationId);
    
    return this.http.put<StagiaireRecommendationDto>(`${this.apiUrl}/status`, request, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(updated => {
          console.log('✅ Statut mis à jour:', updated);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * 👁️ Marque une recommandation comme vue
   */
  markAsViewed(recommendationId: number): Observable<any> {
    console.log('👁️ Marquage comme vue:', recommendationId);
    
    return this.http.post(`${this.apiUrl}/${recommendationId}/mark-viewed`, {}, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(() => console.log('✅ Marqué comme vue')),
        catchError(this.handleError)
      );
  }

  /**
   * 📧 Marque une recommandation comme contactée
   */
  markAsContacted(recommendationId: number, notes?: string): Observable<any> {
    console.log('📧 Marquage comme contactée:', recommendationId);
    
    return this.http.post(`${this.apiUrl}/${recommendationId}/mark-contacted`, 
      notes ? `"${notes}"` : '""', 
      { headers: this.getHeaders() }
    )
      .pipe(
        tap(() => console.log('✅ Marqué comme contactée')),
        catchError(this.handleError)
      );
  }

  /**
   * ⭐ Sélectionne un candidat pour une offre
   */
  selectCandidate(recommendationId: number, notes?: string): Observable<any> {
    console.log('⭐ Sélection du candidat:', recommendationId);
    
    return this.http.post(`${this.apiUrl}/${recommendationId}/select`, 
      notes ? `"${notes}"` : '""', 
      { headers: this.getHeaders() }
    )
      .pipe(
        tap(() => console.log('✅ Candidat sélectionné')),
        catchError(this.handleError)
      );
  }

  /**
   * 🗑️ Supprime les recommandations d'une offre
   */
  deleteRecommendations(jobOfferId: number): Observable<any> {
    console.log('🗑️ Suppression des recommandations pour:', jobOfferId);
    
    return this.http.delete(`${this.apiUrl}/job-offer/${jobOfferId}`, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(() => console.log('✅ Recommandations supprimées')),
        catchError(this.handleError)
      );
  }

  /**
   * 📊 Récupère les statistiques des recommandations
   */
  getRecommendationStats(): Observable<any> {
    console.log('📊 Récupération des statistiques de recommandations');
    
    return this.http.get(`${this.apiUrl}/stats`, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(stats => console.log('📈 Statistiques récupérées:', stats)),
        catchError(this.handleError)
      );
  }

  /**
   * 🎨 Formate le score de compatibilité pour l'affichage
   */
  formatScore(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  /**
   * 🏆 Détermine la classe CSS selon le score
   */
  getScoreClass(score: number): string {
    if (score >= 0.7) return 'score-excellent';
    if (score >= 0.5) return 'score-good';
    if (score >= 0.3) return 'score-fair';
    return 'score-poor';
  }

  /**
   * ⭐ Génère des étoiles pour la notation
   */
  getRatingStars(rating: number): { full: number; half: boolean; empty: number } {
    const fullStars = Math.floor(rating);
    const hasHalfStar = (rating % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return {
      full: fullStars,
      half: hasHalfStar,
      empty: emptyStars
    };
  }

  /**
   * 🎯 Formate les compétences pour l'affichage
   */
  formatSkills(skills: string): string[] {
    if (!skills) return [];
    return skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }

  /**
   * 📅 Formate une date relative
   */
  formatRelativeDate(date: Date | string): string {
    const targetDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - targetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays <= 7) return `Il y a ${diffDays} jours`;
    if (diffDays <= 30) return `Il y a ${Math.ceil(diffDays / 7)} semaines`;
    return targetDate.toLocaleDateString('fr-FR');
  }

  /**
   * 📧 Génère un lien mailto pour contacter un candidat
   */
  generateEmailLink(candidate: StagiaireRecommendation, jobTitle: string): string {
    const subject = encodeURIComponent(`Opportunité d'emploi - ${jobTitle}`);
    const body = encodeURIComponent(
      `Bonjour ${candidate.name},\n\n` +
      `Nous avons une opportunité qui pourrait vous intéresser : ${jobTitle}\n\n` +
      `Nous serions ravis de discuter de cette opportunité avec vous.\n\n` +
      `Cordialement,\n` +
      `L'équipe RH`
    );
    
    return `mailto:${candidate.email}?subject=${subject}&body=${body}`;
  }

  /**
   * ✅ Valide si un utilisateur peut générer des recommandations
   */
  canGenerateRecommendations(userRole: string): boolean {
    return userRole === 'RHs' || userRole === 'Admin';
  }

  /**
   * 🔍 Vérifie si le service de recommandation IA est disponible
   */
  checkServiceHealth(): Observable<any> {
    console.log('🔍 Vérification de la santé du service IA');
    
    return this.http.get(`${environment.apiUrl}/api/recommendation/health`, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(() => console.log('✅ Service IA disponible')),
        catchError(error => {
          console.log('⚠️ Service IA indisponible:', error);
          return throwError(() => error);
        })
      );
  }
  /**
 * Test la connexion avec l'API Python via l'API .NET
 */
/**
 * Test la connexion avec l'API Python via l'API .NET
 */
testPythonConnection(): Observable<any> {
  console.log('🔧 Test de connexion Python via API .NET...');
  
  return this.http.get(`${this.apiUrl}/test-python-connection`).pipe(
    map(response => {
      console.log('📡 Réponse test Python:', response);
      return response;
    }),
    catchError((error) => {
      console.error('❌ Erreur test Python:', error);
      
      const errorResult = {
        success: false,
        error: error.error?.error || error.message || 'Erreur de connexion',
        pythonApiUrl: error.error?.pythonApiUrl || 'Inconnue'
      };
      
      return throwError(() => errorResult);
    })
  );
}
}