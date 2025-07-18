import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of, forkJoin, timer } from 'rxjs';
import { tap, catchError, map, switchMap, retry, finalize, shareReplay } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

// 📝 Types et interfaces
export enum EvaluationType {
  TuteurToStagiaire = 0,
  RHToStagiaire = 1,
  StagiaireToTuteur = 2
}

export enum RatingStatus {
  Draft = 0,
  Submitted = 1,
  Approved = 2,
  Rejected = 3
}

export interface CreateRatingDto {
  evaluatedUserId: number;
  score: number;
  comment: string;
  type: EvaluationType;
  detailedScores?: DetailedEvaluationCriteria;
  tutorScores?: TutorEvaluationCriteria;
  evaluationPeriodStart?: Date;
  evaluationPeriodEnd?: Date;
  stageReference?: string;
}

export interface UpdateRatingDto {
  score?: number;
  comment?: string;
  detailedScores?: DetailedEvaluationCriteria;
  tutorScores?: TutorEvaluationCriteria;
  evaluationPeriodStart?: Date;
  evaluationPeriodEnd?: Date;
  stageReference?: string;
}

export interface RatingDetailDto {
  id: number;
  evaluatorId: number;
  evaluatorName: string;
  evaluatorRole: string;
  evaluatorProfilePicture?: string;
  evaluatedUserId: number;
  evaluatedUserName: string;
  evaluatedUserRole: string;
  evaluatedUserProfilePicture?: string;
  score: number;
  comment: string;
  type: EvaluationType;
  status: RatingStatus;
  detailedScores?: DetailedEvaluationCriteria;
  tutorScores?: TutorEvaluationCriteria;
  createdAt: Date;
  updatedAt?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedByUserId?: number;
  approvedByUserName?: string;
  response?: string;
  responseDate?: Date;
  evaluationPeriodStart?: Date;
  evaluationPeriodEnd?: Date;
  stageReference?: string;
}

export interface RatingListDto {
  id: number;
  evaluatorName: string;
   evaluatedUserId: number; 
  evaluatedUserName: string;
  score: number;
  type: EvaluationType;
  status: RatingStatus;
  createdAt: Date;
  submittedAt?: Date;
  stageReference?: string;
}

export interface RatingFilterDto {
  evaluatorId?: number;
  evaluatedUserId?: number;
  type?: EvaluationType;
  status?: RatingStatus;
  fromDate?: Date;
  toDate?: Date;
  minScore?: number;
  maxScore?: number;
  stageReference?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface PagedRatingResultDto {
  ratings: RatingListDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RatingStatsDto {
  totalRatings: number;
  averageScoreGiven: number;
  averageScore: number;
  pendingRatings: number;
  approvedRatings: number;
  draftRatings: number;
  scoreDistribution: { [key: number]: number };
  statsByType: { [key: string]: RatingTypeStats };
  specialStats?: { [key: string]: any };
}

export interface RatingTypeStats {
  count: number;
  averageScore: number;
  lastRatingDate?: Date;
}

export interface DetailedEvaluationCriteria {
  technicalSkills: number;
  communication: number;
  teamwork: number;
  initiative: number;
  punctuality: number;
  problemSolving: number;
  adaptability: number;
  overallPerformance: number;
}

export interface TutorEvaluationCriteria {
  availability: number;
  guidance: number;
  communication: number;
  expertise: number;
  support: number;
  feedback: number;
  overallSatisfaction: number;
}

export interface RatingResponseDto {
  ratingId: number;
  response: string;
}

export interface ApproveRatingDto {
  ratingId: number;
  isApproved: boolean;
  approvalComment?: string;
}
export interface BestStagiaireStats {
  name: string;
  score: number;
  evaluationDate: Date;
}

export interface TopUserStats {
  userId: number;
  name: string;
  averageScore: number;
  evaluationCount: number;
}

export interface SpecialStatsData {
  bestStagiaire?: BestStagiaireStats;
  topTutors?: TopUserStats[];
  topStagiaires?: TopUserStats[];
}


@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private apiUrl = `${environment.apiUrl}/api/rating`;
  private isBrowser: boolean;

  // 🔄 État réactif
  private _myRatings$ = new BehaviorSubject<RatingListDto[]>([]);
  private _ratingsAboutMe$ = new BehaviorSubject<RatingListDto[]>([]);
  private _pendingApprovals$ = new BehaviorSubject<RatingListDto[]>([]);
  private _draftRatings$ = new BehaviorSubject<RatingListDto[]>([]);
  private _userStats$ = new BehaviorSubject<RatingStatsDto | null>(null);

  // 📊 Observables publics
  public myRatings$ = this._myRatings$.asObservable();
  public ratingsAboutMe$ = this._ratingsAboutMe$.asObservable();
  public pendingApprovals$ = this._pendingApprovals$.asObservable();
  public draftRatings$ = this._draftRatings$.asObservable();
  public userStats$ = this._userStats$.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // 🔐 Headers avec authentification
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

  // 🔄 Gestion des erreurs
  private handleError(error: any, context?: string) {
    console.error(`🚫 Erreur Rating Service${context ? ` (${context})` : ''}:`, error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides. Veuillez vérifier votre saisie.';
          break;
        case 401:
          errorMessage = 'Vous n\'êtes pas authentifié. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Vous n\'avez pas les permissions pour cette action.';
          break;
        case 404:
          errorMessage = 'Évaluation non trouvée.';
          break;
        case 409:
          errorMessage = 'Une évaluation existe déjà pour cet utilisateur.';
          break;
        case 500:
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.statusText || 'Erreur inconnue'}`;
      }
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // 📝 CRUD Operations

  /**
 * ➕ Créer une nouvelle évaluation
 */
createRating(createRatingDto: CreateRatingDto): Observable<RatingDetailDto> {
  console.log('🆕 Création d\'une nouvelle évaluation:', createRatingDto);
  
  return this.http.post<RatingDetailDto>(this.apiUrl, createRatingDto, { 
    headers: this.getHeaders() 
  }).pipe(
    tap(response => {
      console.log('✅ Évaluation créée avec succès:', response);
      // 🔧 Attendre un peu avant de refresh pour éviter les conflits
      timer(500).subscribe(() => this.refreshData());
    }),
    catchError(error => this.handleError(error, 'createRating'))
  );
}

/**
 * ✏️ Mettre à jour une évaluation
 */
updateRating(id: number, updateRatingDto: UpdateRatingDto): Observable<RatingDetailDto> {
  console.log(`📝 Mise à jour de l'évaluation ${id}:`, updateRatingDto);
  
  return this.http.put<RatingDetailDto>(`${this.apiUrl}/${id}`, updateRatingDto, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('✅ Évaluation mise à jour:', response);
      // 🔧 Attendre un peu avant de refresh
      timer(500).subscribe(() => this.refreshData());
    }),
    catchError(error => this.handleError(error, 'updateRating'))
  );
}

  /**
   * 👁️ Récupérer une évaluation par ID
   */
  getRatingById(id: number): Observable<RatingDetailDto> {
  console.log('🔍 Service: Récupération évaluation ID:', id);
  
  return this.http.get<RatingDetailDto>(`${this.apiUrl}/${id}`, {
    headers: this.getHeaders()
  }).pipe(
    tap(rating => {
      console.log('✅ Service: Évaluation reçue:', rating);
      console.log('📊 Detailed Scores:', rating.detailedScores);
      console.log('👨‍🏫 Tutor Scores:', rating.tutorScores);
      console.log('🎯 Type:', rating.type);
      
      // Validation des données
      if (rating.type === EvaluationType.StagiaireToTuteur && !rating.tutorScores) {
        console.warn('⚠️ Évaluation tuteur sans critères tuteur!');
      }
      if (rating.type !== EvaluationType.StagiaireToTuteur && !rating.detailedScores) {
        console.warn('⚠️ Évaluation standard sans critères détaillés!');
      }
    }),
    catchError(error => this.handleError(error, 'getRatingById'))
  );
}

  /**
   * 🗑️ Supprimer une évaluation
   */
  deleteRating(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(() => true),
      tap(() => {
        console.log(`🗑️ Évaluation ${id} supprimée`);
        this.refreshData();
      }),
      catchError(error => {
        console.error('Erreur lors de la suppression:', error);
        return of(false);
      })
    );
  }

  /**
   * 📤 Soumettre une évaluation pour approbation
   */
  submitRating(id: number): Observable<RatingDetailDto> {
    return this.http.post<RatingDetailDto>(`${this.apiUrl}/${id}/submit`, {}, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        console.log(`📤 Évaluation ${id} soumise pour approbation`);
        this.refreshData();
      }),
      catchError(error => this.handleError(error, 'submitRating'))
    );
  }

  /**
   * 📝 Récupérer mes évaluations
   */
  getMyRatings(type?: EvaluationType, forceRefresh = false): Observable<RatingListDto[]> {
    if (!forceRefresh && this._myRatings$.value.length > 0) {
      return this.myRatings$;
    }

    let params = new HttpParams();
    if (type !== undefined) {
      params = params.set('type', type.toString());
    }

    return this.http.get<RatingListDto[]>(`${this.apiUrl}/my-ratings`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(ratings => {
        console.log('📝 Mes évaluations récupérées:', ratings.length);
        this._myRatings$.next(ratings);
      }),
      catchError(error => this.handleError(error, 'getMyRatings'))
    );
  }

  /**
   * 👁️ Récupérer les évaluations me concernant
   */
  getRatingsAboutMe(forceRefresh = false): Observable<RatingListDto[]> {
    if (!forceRefresh && this._ratingsAboutMe$.value.length > 0) {
      return this.ratingsAboutMe$;
    }

    return this.http.get<RatingListDto[]>(`${this.apiUrl}/about-me`, {
      headers: this.getHeaders()
    }).pipe(
      tap(ratings => {
        console.log('👁️ Évaluations me concernant récupérées:', ratings.length);
        this._ratingsAboutMe$.next(ratings);
      }),
      catchError(error => this.handleError(error, 'getRatingsAboutMe'))
    );
  }

  /**
   * 📄 Récupérer mes brouillons
   */
  getDraftRatings(forceRefresh = false): Observable<RatingListDto[]> {
    if (!forceRefresh && this._draftRatings$.value.length > 0) {
      return this.draftRatings$;
    }

    return this.http.get<RatingListDto[]>(`${this.apiUrl}/drafts`, {
      headers: this.getHeaders()
    }).pipe(
      tap(ratings => {
        console.log('📄 Brouillons récupérés:', ratings.length);
        this._draftRatings$.next(ratings);
      }),
      catchError(error => this.handleError(error, 'getDraftRatings'))
    );
  }

  /**
   * 👥 Récupérer les utilisateurs que je peux évaluer
   */
  getUsersICanRate(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users-i-can-rate`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Erreur récupération utilisateurs évaluables:', error);
        return of([]);
      })
    );
  }

  /**
 * 📈 Récupérer mes statistiques d'évaluation - VERSION SÉCURISÉE
 */
getMyRatingStats(forceRefresh = false): Observable<RatingStatsDto | null> {
  if (!forceRefresh && this._userStats$.value) {
    return this.userStats$.pipe(map(stats => stats));
  }

  return this.http.get<RatingStatsDto>(`${this.apiUrl}/stats/me`, {
    headers: this.getHeaders()
  }).pipe(
    tap(stats => {
      console.log('📈 Mes statistiques récupérées:', stats);
      this._userStats$.next(stats);
    }),
    catchError(error => {
      console.warn('⚠️ Statistiques non disponibles (continuant sans elles):', error);
      // 🔧 NE PAS FAIRE ÉCHOUER - retourner null
      this._userStats$.next(null);
      return of(null);
    })
  );
}

 /**
 * 🔄 Actualiser toutes les données - VERSION SÉCURISÉE
 */
refreshData(): void {
  // 🔧 Protection contre les appels multiples
  if (this._isRefreshing) {
    console.log('🚫 Refresh déjà en cours, ignoré');
    return;
  }

  this._isRefreshing = true;
  console.log('🔄 Actualisation des données Rating...');
  
  // 🔧 Charger seulement les données critiques d'abord
  const criticalOperations = [
    this.getMyRatings(undefined, true),
    this.getRatingsAboutMe(true),
    this.getDraftRatings(true)
  ];

  // 🔧 Charger les stats de manière optionnelle
  const optionalOperations = [
    this.getMyRatingStats(true).pipe(
      catchError(error => {
        console.warn('⚠️ Stats non disponibles (non-critique):', error);
        return of(null); // Ne pas faire échouer
      })
    )
  ];

  // Exécuter les opérations critiques
  forkJoin(criticalOperations).pipe(
    finalize(() => {
      this._isRefreshing = false;
    })
  ).subscribe({
    next: () => {
      console.log('✅ Données critiques chargées');
      // Charger les stats en arrière-plan (optionnel)
      optionalOperations[0].subscribe();
    },
    error: (error) => {
      console.error('❌ Erreur lors du chargement des données critiques:', error);
    }
  });
}
private _isRefreshing = false;


  /**
   * 🧹 Nettoyer le cache
   */
  clearCache(): void {
    console.log('🧹 Nettoyage du cache Rating');
    this._myRatings$.next([]);
    this._ratingsAboutMe$.next([]);
    this._pendingApprovals$.next([]);
    this._draftRatings$.next([]);
    this._userStats$.next(null);
  }

  // 🎨 Méthodes d'aide pour l'interface

  /**
   * 🎨 Obtenir la couleur selon le score
   */
  getScoreColor(score: number): string {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  }

  /**
   * 🏷️ Obtenir le badge de statut
   */
  getStatusBadge(status: RatingStatus): { class: string; text: string } {
    switch (status) {
      case RatingStatus.Draft:
        return { class: 'bg-gray-100 text-gray-800', text: 'Brouillon' };
      case RatingStatus.Submitted:
        return { class: 'bg-blue-100 text-blue-800', text: 'Soumis' };
      case RatingStatus.Approved:
        return { class: 'bg-green-100 text-green-800', text: 'Approuvé' };
      case RatingStatus.Rejected:
        return { class: 'bg-red-100 text-red-800', text: 'Rejeté' };
      default:
        return { class: 'bg-gray-100 text-gray-800', text: 'Inconnu' };
    }
  }

  /**
   * 📝 Obtenir le libellé du type d'évaluation
   */
  getEvaluationTypeLabel(type: EvaluationType): string {
    switch (type) {
      case EvaluationType.TuteurToStagiaire:
        return 'Tuteur → Stagiaire';
      case EvaluationType.RHToStagiaire:
        return 'RH → Stagiaire';
      case EvaluationType.StagiaireToTuteur:
        return 'Stagiaire → Tuteur';
      default:
        return 'Type inconnu';
    }
  }

  /**
   * ⭐ Obtenir les étoiles selon le score
   */
  getStarArray(score: number): boolean[] {
    const stars: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(score));
    }
    return stars;
  }

  addResponse(ratingId: number, responseDto: RatingResponseDto): Observable<RatingDetailDto> {
  console.log(`💬 Ajout d'une réponse à l'évaluation ${ratingId}:`, responseDto);
  
  return this.http.post<RatingDetailDto>(`${this.apiUrl}/${ratingId}/response`, responseDto, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('✅ Réponse ajoutée avec succès:', response);
      this.refreshData();
    }),
    catchError(error => this.handleError(error, 'addResponse'))
  );
}

/**
 * ✅ Approuver une évaluation
 */
approveRating(ratingId: number, approveDto: ApproveRatingDto): Observable<RatingDetailDto> {
  console.log(`✅ Approbation de l'évaluation ${ratingId}:`, approveDto);
  
  return this.http.post<RatingDetailDto>(`${this.apiUrl}/${ratingId}/approve`, approveDto, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('✅ Évaluation approuvée avec succès:', response);
      this.refreshData();
    }),
    catchError(error => this.handleError(error, 'approveRating'))
  );
}

/**
 * ❌ Rejeter une évaluation
 */
rejectRating(ratingId: number, rejectionReason: string): Observable<RatingDetailDto> {
  console.log(`❌ Rejet de l'évaluation ${ratingId} avec raison:`, rejectionReason);
  
  return this.http.post<RatingDetailDto>(`${this.apiUrl}/${ratingId}/reject`, rejectionReason, {
    headers: this.getHeaders()
  }).pipe(
    tap(response => {
      console.log('✅ Évaluation rejetée avec succès:', response);
      this.refreshData();
    }),
    catchError(error => this.handleError(error, 'rejectRating'))
  );
}

/**
 * 🔧 Diagnostic du service pour debugging
 */
diagnoseService(): void {
  console.group('🔍 Diagnostic RatingService');
  console.log('- Is refreshing:', this._isRefreshing);
  console.log('- My ratings count:', this._myRatings$.value.length);
  console.log('- Ratings about me count:', this._ratingsAboutMe$.value.length);
  console.log('- Draft ratings count:', this._draftRatings$.value.length);
  console.log('- Has stats:', this._userStats$.value !== null);
  console.groupEnd();
}



/**
 * 👥 Récupérer les utilisateurs que je peux évaluer ET qui ne sont pas encore évalués
 */
getUsersICanRateNotEvaluated(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/users-i-can-rate-not-evaluated`, {
    headers: this.getHeaders()
  }).pipe(
    tap(users => {
      console.log('👥 Utilisateurs évaluables (endpoint optimisé):', users.length);
      console.log('📊 Détail:', users.map(u => ({ 
        id: u.id, 
        name: `${u.firstName} ${u.lastName}`, 
        role: u.role 
      })));
    }),
    catchError(error => {
      console.error('❌ Erreur endpoint optimisé, fallback vers filtrage client:', error);
      // 🔧 FALLBACK vers la méthode simplifiée
      return this.getUsersICanRateWithClientSideFiltering();
    })
  );
}


/**
 * 🔧 MÉTHODE FALLBACK: Filtrage côté client si le backend n'est pas prêt
 */
private getUsersICanRateWithClientSideFiltering(): Observable<any[]> {
  return forkJoin({
    availableUsers: this.getUsersICanRate(),
    myRatings: this.getMyRatings()
  }).pipe(
    map(({ availableUsers, myRatings }) => {
      // Extraire les IDs des utilisateurs déjà évalués
      const evaluatedUserIds = new Set(
        myRatings
          .filter(rating => rating.status !== RatingStatus.Rejected) // Exclure les rejetés
          .map(rating => rating.evaluatedUserId)
      );

      // Filtrer les utilisateurs disponibles
      const notEvaluatedUsers = availableUsers.filter(
        user => !evaluatedUserIds.has(user.id)
      );

      console.log('🔍 Filtrage côté client:');
      console.log('- Utilisateurs disponibles:', availableUsers.length);
      console.log('- Utilisateurs déjà évalués:', evaluatedUserIds.size);
      console.log('- Utilisateurs non évalués:', notEvaluatedUsers.length);

      return notEvaluatedUsers;
    }),
    catchError(error => {
      console.error('Erreur lors du filtrage côté client:', error);
      // En cas d'erreur, retourner la liste complète
      return this.getUsersICanRate();
    })
  );
}





/**
 * 🔧 Dernier fallback: filtrage côté client
 */
private getGenericRatingsAndFilter(userId: number): Observable<RatingListDto[]> {
  console.log(`🔧 Dernier fallback: filtrage côté client pour l'utilisateur ${userId}`);
  
  return forkJoin({
    myRatings: this.getMyRatings().pipe(catchError(() => of([]))),
    aboutMeRatings: this.getRatingsAboutMe().pipe(catchError(() => of([])))
  }).pipe(
    map(({ myRatings, aboutMeRatings }) => {
      const allRatings = [...myRatings, ...aboutMeRatings];
      const filtered = allRatings.filter(rating => rating.evaluatedUserId === userId);
      
      // Éliminer les doublons
      const uniqueRatings = filtered.filter((rating, index, self) => 
        index === self.findIndex(r => r.id === rating.id)
      );
      
      console.log(`🎯 Filtrage client: ${uniqueRatings.length} évaluations pour l'utilisateur ${userId}`);
      return uniqueRatings;
    })
  );
}



/**
 * 👁️ Récupérer les évaluations reçues par un utilisateur spécifique - VERSION CORRIGÉE
 */
getRatingsForUser(userId: number): Observable<RatingListDto[]> {
  console.log(`🔍 Récupération des évaluations pour l'utilisateur ${userId}`);
  
  return this.http.get<RatingListDto[]>(`${this.apiUrl}/user/${userId}/received`, {
    headers: this.getHeaders()
  }).pipe(
    tap(ratings => {
      console.log(`✅ ${ratings.length} évaluations récupérées pour l'utilisateur ${userId}`);
      ratings.forEach(rating => {
        console.log(`📋 Évaluation: ID=${rating.id}, Score=${rating.score}, Par=${rating.evaluatorName}`);
      });
    }),
    catchError(error => {
      console.warn(`⚠️ Erreur lors de la récupération des évaluations pour l'utilisateur ${userId}:`, error);
      
      // 🔧 FALLBACK amélioré
      return this.getRatingsForUserFallback(userId);
    })
  );
}

/**
 * 📊 Récupérer la moyenne des évaluations d'un utilisateur - NOUVELLE MÉTHODE
 */
getUserAverageRating(userId: number, type?: EvaluationType): Observable<number> {
  console.log(`📊 Récupération de la moyenne pour l'utilisateur ${userId}`);
  
  let params = new HttpParams();
  if (type !== undefined) {
    params = params.set('type', type.toString());
  }
  
  return this.http.get<number>(`${this.apiUrl}/user/${userId}/average`, {
    headers: this.getHeaders(),
    params: params
  }).pipe(
    tap(average => {
      console.log(`✅ Moyenne récupérée pour l'utilisateur ${userId}: ${average}`);
    }),
    catchError(error => {
      console.warn(`⚠️ Erreur lors de la récupération de la moyenne pour l'utilisateur ${userId}:`, error);
      // En cas d'erreur, calculer côté client
      return this.calculateAverageFromRatings(userId, type);
    })
  );
}

/**
 * 🔄 Méthode de fallback améliorée pour getRatingsForUser
 */
private getRatingsForUserFallback(userId: number): Observable<RatingListDto[]> {
  console.log(`🔄 Fallback: tentative alternative pour l'utilisateur ${userId}`);
  
  // Essayer avec des paramètres sur l'endpoint principal
  let params = new HttpParams().set('evaluatedUserId', userId.toString());
  
  return this.http.get<any>(`${this.apiUrl}`, {
    headers: this.getHeaders(),
    params: params
  }).pipe(
    map(response => {
      // Si la réponse est un objet avec une propriété ratings
      if (response && response.ratings && Array.isArray(response.ratings)) {
        return response.ratings as RatingListDto[];
      }
      
      // Si la réponse est directement un array
      if (Array.isArray(response)) {
        return response as RatingListDto[];
      }
      
      console.warn('⚠️ Format de réponse inattendu:', response);
      return [];
    }),
    catchError(error => {
      console.error(`❌ Échec total pour l'utilisateur ${userId}:`, error);
      
      // 🔧 DERNIER FALLBACK: Retourner les évaluations générales filtrées côté client
      return this.getGenericRatingsAndFilter(userId);
    })
  );
}

/**
 * 🔄 Calcul côté client de la moyenne en cas d'échec de l'endpoint
 */
private calculateAverageFromRatings(userId: number, type?: EvaluationType): Observable<number> {
  console.log(`🔄 Calcul côté client de la moyenne pour l'utilisateur ${userId}`);
  
  return this.getRatingsForUser(userId).pipe(
    map(ratings => {
      let filteredRatings = ratings;
      
      if (type !== undefined) {
        filteredRatings = ratings.filter(r => r.type === type);
      }
      
      if (filteredRatings.length === 0) {
        return 0;
      }
      
      const average = filteredRatings.reduce((sum, r) => sum + r.score, 0) / filteredRatings.length;
      console.log(`🧮 Moyenne calculée côté client: ${average.toFixed(2)}`);
      return Math.round(average * 100) / 100;
    }),
    catchError(() => of(0))
  );
}
}