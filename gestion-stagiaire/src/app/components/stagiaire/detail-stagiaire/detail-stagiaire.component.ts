import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { DepartmentService } from '../../../services/Department/department.service';
import { ReportService } from '../../../services/Report/report.service';
import { RatingService, RatingDetailDto, RatingListDto, EvaluationType } from '../../../services/Rating/rating.service';
import { environment } from '../../../environments/environment';
import { User, UserRole, Department } from '../../models/user';
import { Report } from '../../models/Report';

interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  completedDate?: Date;
  relatedReport?: Report;
}

interface StagiaireDetailedInfo {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  image: string;
  isFavorite: boolean;
  
  // Informations personnelles
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  statuts: boolean;
  
  // Informations académiques
  universityName?: string;
  universityId?: number;
  stage?: string;
  etudiant?: string;
  
  // Informations de stage
  departmentId?: number;
  departmentName?: string;
  tuteurId?: number;
  tuteurName?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  note?: number;
  
  // Compétences et CV
  skills?: string;
  skillsArray?: string[];
  cvUrl?: string;
  cvOriginalFileName?: string;
  cvUploadedAt?: Date;
  
  // Progression et performance
  progressValue: number;
  isCompleted: boolean;
  daysRemaining?: number;
  totalDuration?: number;
  
  // Statistiques
  stats: {
    totalReports: number;
    approvedReports: number;
    pendingReports: number;
    rejectedReports: number;
    averageRating: number;
    totalRatings: number;
    lastActivityDate?: Date;
  };
  
  // Collections
  reports?: Report[];
  ratings?: RatingDetailDto[];
  tasks?: TaskItem[];
}

@Component({
  selector: 'app-detail-stagiaire',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatBadgeModule,
    SidebarComponent,
    MatSnackBarModule
  ],
  templateUrl: './detail-stagiaire.component.html',
  styleUrls: ['./detail-stagiaire.component.scss']
})
export class DetailStagiaireComponent implements OnInit, AfterViewInit {
  isSidebarVisible = true;
  stagiaireId: number = 0;
  stagiaire?: StagiaireDetailedInfo;
  isLoading = true;
  error = false;
  departments: Department[] = [];
  
  // Onglets actifs
  selectedTabIndex = 0;
  
  // Retry logic
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 seconde

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private userService: UserService,
    private departmentService: DepartmentService,
    private reportService: ReportService,
    private ratingService: RatingService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Initialisation du composant DetailStagiaire');
    
    // Charger les départements d'abord
    this.loadDepartments();
    
    // Attendre un peu pour que les services soient prêts et éviter les race conditions
    setTimeout(() => {
      this.route.params.subscribe(params => {
        this.stagiaireId = +params['id'];
        console.log('📋 ID du stagiaire reçu:', this.stagiaireId);
        
        if (this.stagiaireId && !isNaN(this.stagiaireId) && this.stagiaireId > 0) {
          this.debugNetworkRequests();
          this.loadStagiaireCompleteDataWithRetry();
        } else {
          console.error('❌ ID de stagiaire invalide:', params['id']);
          this.error = true;
          this.isLoading = false;
          this.showErrorMessage('ID de stagiaire invalide');
        }
      });
    }, 100);
  }

  /**
   * 🔄 Méthode avec retry automatique pour gérer les erreurs temporaires
   */
  private async loadStagiaireCompleteDataWithRetry(): Promise<void> {
    try {
      await this.loadStagiaireCompleteData();
      this.retryCount = 0; // Reset counter on success
      console.log('✅ Chargement réussi');
    } catch (error: any) {
      console.error(`❌ Tentative ${this.retryCount + 1} échouée:`, error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Nouvelle tentative dans ${this.retryDelay}ms... (${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.loadStagiaireCompleteDataWithRetry();
        }, this.retryDelay);
        
        // Augmenter le délai pour la prochaine tentative
        this.retryDelay = Math.min(this.retryDelay * 1.5, 5000); // Max 5 secondes
      } else {
        console.error('❌ Toutes les tentatives ont échoué');
        this.error = true;
        this.isLoading = false;
        this.showErrorMessage('Impossible de charger les données du stagiaire après plusieurs tentatives');
      }
    }
  }

  /**
   * 🔧 Méthode principale de chargement avec gestion d'erreurs améliorée
   */
  private async loadStagiaireCompleteData(): Promise<void> {
    this.isLoading = true;
    this.error = false;

    try {
      console.log(`🔍 Chargement des données pour le stagiaire ${this.stagiaireId}`);

      // Vérifier que l'ID est valide
      if (!this.stagiaireId || isNaN(this.stagiaireId) || this.stagiaireId <= 0) {
        throw new Error(`ID de stagiaire invalide: ${this.stagiaireId}`);
      }

      // 1. Charger l'utilisateur d'abord (données essentielles)
      console.log('📋 Étape 1: Chargement des données utilisateur...');
      const user = await this.userService.getUserById(this.stagiaireId).toPromise();
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      console.log('✅ Données utilisateur chargées:', user);

      // 2. Charger les données complémentaires en parallèle avec gestion d'erreurs individuelles
      console.log('📊 Étape 2: Chargement des données complémentaires...');
      const [reportsResult, cvInfoResult, ratingsResult] = await Promise.allSettled([
        this.loadReportsSafely(),
        this.loadCvInfoSafely(),
        this.loadStagiaireRatingsSafely()
      ]);

      // Traiter les résultats
      const reports = reportsResult.status === 'fulfilled' ? reportsResult.value : [];
      const cvInfo = cvInfoResult.status === 'fulfilled' ? cvInfoResult.value : null;
      const ratings = ratingsResult.status === 'fulfilled' ? ratingsResult.value : [];

      // Log des résultats pour debug
      console.log('📊 Résumé des données chargées:');
      console.log('- Rapports:', reports.length, reportsResult.status === 'rejected' ? '(erreur)' : '(ok)');
      console.log('- Évaluations:', ratings.length, ratingsResult.status === 'rejected' ? '(erreur)' : '(ok)');
      console.log('- CV:', cvInfo ? 'Présent' : 'Absent', cvInfoResult.status === 'rejected' ? '(erreur)' : '(ok)');

      if (reportsResult.status === 'rejected') {
        console.warn('⚠️ Erreur lors du chargement des rapports:', reportsResult.reason);
      }
      if (cvInfoResult.status === 'rejected') {
        console.warn('⚠️ Erreur lors du chargement du CV:', cvInfoResult.reason);
      }
      if (ratingsResult.status === 'rejected') {
        console.warn('⚠️ Erreur lors du chargement des évaluations:', ratingsResult.reason);
      }

      // 3. Construire l'objet stagiaire complet
      this.stagiaire = this.buildStagiaireDetailedInfo(user, reports, ratings, cvInfo);
      
      console.log('✅ Objet stagiaire construit avec succès');

    } catch (error: any) {
      console.error('❌ Erreur lors du chargement principal:', error);
      throw error; // Re-throw pour le retry logic
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 🛡️ Méthodes de chargement sécurisées avec gestion d'erreurs
   */
  private async loadReportsSafely(): Promise<any[]> {
    try {
      console.log('📝 Chargement des rapports...');
      const reports = await this.reportService.getReportsByStagiaire(this.stagiaireId).toPromise();
      console.log(`✅ ${(reports || []).length} rapports chargés`);
      return reports || [];
    } catch (error: any) {
      console.warn('⚠️ Impossible de charger les rapports:', error);
      return [];
    }
  }

  private async loadCvInfoSafely(): Promise<any> {
    try {
      console.log('📄 Chargement des infos CV...');
      const cvInfo = await this.userService.getUserCvInfo(this.stagiaireId).toPromise();
      console.log('✅ Infos CV chargées:', cvInfo ? 'Présent' : 'Absent');
      return cvInfo;
    } catch (error: any) {
      console.warn('⚠️ Impossible de charger les infos CV:', error);
      return null;
    }
  }

 private async loadStagiaireRatingsSafely(): Promise<RatingDetailDto[]> {
  try {
    console.log(`⭐ Chargement des évaluations pour le stagiaire ${this.stagiaireId}`);
    
    // 🆕 UTILISER LE NOUVEL ENDPOINT
    const ratings = await this.ratingService.getRatingsForUser(this.stagiaireId).toPromise();
    
    if (ratings && ratings.length > 0) {
      console.log(`✅ ${ratings.length} évaluations trouvées via le nouvel endpoint`);
      return await this.convertRatingListToDetail(ratings);
    } else {
      console.log(`📭 Aucune évaluation trouvée pour le stagiaire ${this.stagiaireId}`);
      return [];
    }

  } catch (error: any) {
    console.warn('⚠️ Impossible de charger les évaluations via le nouvel endpoint:', error);
    
    // 🔄 Fallback vers les anciennes méthodes
    return await this.loadRatingsFallback();
  }
}

  /**
   * 🎯 Méthode d'évaluations améliorée avec multiple fallbacks
   */
  private async loadStagiaireRatings(): Promise<RatingDetailDto[]> {
    try {
      console.log(`🔍 Chargement des évaluations pour le stagiaire ${this.stagiaireId}`);
      
      // Méthode 1: Utiliser getRatingsForUser si disponible
      if (typeof this.ratingService.getRatingsForUser === 'function') {
        console.log('📋 Tentative avec getRatingsForUser...');
        try {
          const ratings = await this.ratingService.getRatingsForUser(this.stagiaireId).toPromise();
          
          if (ratings && ratings.length > 0) {
            console.log(`✅ ${ratings.length} évaluations trouvées via getRatingsForUser`);
            return await this.convertRatingListToDetail(ratings);
          }
        } catch (error) {
          console.warn('⚠️ getRatingsForUser a échoué, tentative de fallback...', error);
        }
      } else {
        console.log('📋 getRatingsForUser non disponible, passage au fallback...');
      }

      // Méthode 2: Fallback avec les autres méthodes
      console.log('🔄 Utilisation des méthodes de fallback...');
      return await this.loadRatingsFallback();

    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des évaluations:', error);
      
      // Si l'erreur est un 400, on essaie quand même le fallback
      const errorStatus = error?.status || error?.error?.status || (error as any)?.statusCode;
      if (errorStatus === 400) {
        console.log('🔄 Erreur 400 détectée, tentative de fallback final...');
        try {
          return await this.loadRatingsFallback();
        } catch (fallbackError) {
          console.error('❌ Fallback final échoué:', fallbackError);
          return [];
        }
      }
      
      return [];
    }
  }

  /**
   * 🔄 Fallback robuste avec plusieurs stratégies
   */
  private async loadRatingsFallback(): Promise<RatingDetailDto[]> {
    console.log('🔄 Méthodes de fallback activées...');

    // Liste des stratégies de fallback dans l'ordre de préférence
    const fallbackStrategies = [
      {
        name: 'Mes évaluations',
        method: () => this.tryGetMyRatings()
      },
      {
        name: 'Évaluations me concernant',
        method: () => this.tryGetRatingsAboutMe()
      },
      {
        name: 'Cache global',
        method: () => this.tryGetFromCache()
      }
    ];

    for (const strategy of fallbackStrategies) {
      try {
        console.log(`🔄 Tentative: ${strategy.name}...`);
        const result = await strategy.method();
        
        if (result.length > 0) {
          console.log(`✅ Succès avec "${strategy.name}": ${result.length} évaluations`);
          return result;
        } else {
          console.log(`📭 Aucun résultat avec "${strategy.name}"`);
        }
      } catch (error) {
        console.warn(`⚠️ Échec de "${strategy.name}":`, error);
        continue;
      }
    }

    console.log('📭 Aucune évaluation trouvée via toutes les méthodes de fallback');
    return [];
  }

  private async tryGetMyRatings(): Promise<RatingDetailDto[]> {
    try {
      const myRatings = await this.ratingService.getMyRatings(undefined, true).toPromise();
      const filtered = (myRatings || []).filter(r => r.evaluatedUserId === this.stagiaireId);
      console.log(`🔍 Mes évaluations filtrées: ${filtered.length}`);
      return await this.convertRatingListToDetail(filtered);
    } catch (error) {
      console.warn('❌ Erreur dans tryGetMyRatings:', error);
      return [];
    }
  }

  private async tryGetRatingsAboutMe(): Promise<RatingDetailDto[]> {
    try {
      const aboutMeRatings = await this.ratingService.getRatingsAboutMe(true).toPromise();
      const filtered = (aboutMeRatings || []).filter(r => r.evaluatedUserId === this.stagiaireId);
      console.log(`🔍 Évaluations me concernant filtrées: ${filtered.length}`);
      return await this.convertRatingListToDetail(filtered);
    } catch (error) {
      console.warn('❌ Erreur dans tryGetRatingsAboutMe:', error);
      return [];
    }
  }

  private async tryGetFromCache(): Promise<RatingDetailDto[]> {
    try {
      const cached = this.tryGetFromGlobalCache();
      const filtered = cached.filter(r => r.evaluatedUserId === this.stagiaireId);
      console.log(`🔍 Cache global filtré: ${filtered.length}`);
      return await this.convertRatingListToDetail(filtered);
    } catch (error) {
      console.warn('❌ Erreur dans tryGetFromCache:', error);
      return [];
    }
  }

  /**
   * 💾 Essayer de récupérer depuis un cache global (si implémenté)
   */
  private tryGetFromGlobalCache(): RatingListDto[] {
    try {
      // Vérifier si le service a un cache global
      const service = this.ratingService as any;
      
      // Essayer d'accéder aux données en cache
      if (service._myRatings$ && service._myRatings$.value) {
        const myRatings = service._myRatings$.value;
        console.log(`💾 Cache mes évaluations: ${myRatings.length}`);
        return Array.isArray(myRatings) ? myRatings : [];
      }

      if (service._ratingsAboutMe$ && service._ratingsAboutMe$.value) {
        const aboutMe = service._ratingsAboutMe$.value;
        console.log(`💾 Cache évaluations me concernant: ${aboutMe.length}`);
        return Array.isArray(aboutMe) ? aboutMe : [];
      }

      return [];
    } catch (error) {
      console.log('💾 Pas de cache global disponible ou erreur d\'accès:', error);
      return [];
    }
  }

  /**
   * 🔄 Conversion robuste avec gestion d'erreurs par évaluation
   */
  private async convertRatingListToDetail(ratingsList: RatingListDto[]): Promise<RatingDetailDto[]> {
    if (!ratingsList || ratingsList.length === 0) {
      return [];
    }

    try {
      console.log(`🔄 Conversion de ${ratingsList.length} évaluations en détails`);
      
      const results: RatingDetailDto[] = [];
      
      // Traiter les évaluations une par une pour éviter les échecs en cascade
      for (const [index, rating] of ratingsList.entries()) {
        try {
          // Vérifier que l'objet rating a les propriétés minimales requises
          if (!rating || typeof rating.id === 'undefined') {
            console.warn(`⚠️ Évaluation ${index + 1} invalide:`, rating);
            continue;
          }

          console.log(`🔄 Conversion évaluation ${index + 1}/${ratingsList.length} (ID: ${rating.id})`);
          
          const detailedRating = await this.ratingService.getRatingById(rating.id).toPromise();
          if (detailedRating) {
            results.push(detailedRating);
            console.log(`✅ Évaluation ${rating.id} convertie avec succès`);
          } else {
            console.warn(`⚠️ Détails non disponibles pour l'évaluation ${rating.id}, création d'une version basique`);
            results.push(this.createBasicRatingDetail(rating));
          }
        } catch (error) {
          console.warn(`⚠️ Erreur lors de la conversion de l'évaluation ${rating?.id || 'unknown'}:`, error);
          // Créer une version basique même en cas d'erreur
          if (rating && rating.id) {
            results.push(this.createBasicRatingDetail(rating));
          }
        }
      }

      console.log(`✅ ${results.length} évaluations converties avec succès`);
      return results;

    } catch (error) {
      console.error('❌ Erreur lors de la conversion globale:', error);
      // En cas d'erreur globale, créer des évaluations basiques pour toutes celles qui sont valides
      return ratingsList
        .filter(rating => rating && rating.id)
        .map(rating => this.createBasicRatingDetail(rating));
    }
  }

  /**
   * Crée un RatingDetailDto basique à partir d'un RatingListDto
   */
  private createBasicRatingDetail(rating: RatingListDto): RatingDetailDto {
    return {
      id: rating.id,
      evaluatorId: 0, // Non disponible dans RatingListDto
      evaluatorName: rating.evaluatorName || 'Évaluateur inconnu',
      evaluatorRole: 'Unknown', // À déterminer selon le type
      evaluatorProfilePicture: undefined,
      evaluatedUserId: rating.evaluatedUserId,
      evaluatedUserName: rating.evaluatedUserName || 'Utilisateur inconnu',
      evaluatedUserRole: 'Stagiaire',
      evaluatedUserProfilePicture: undefined,
      score: rating.score || 0,
      comment: '', // Non disponible dans RatingListDto
      type: rating.type,
      status: (rating as any)?.status || 'Submitted', // Gestion sécurisée du status
      detailedScores: undefined,
      tutorScores: undefined,
      createdAt: rating.createdAt,
      updatedAt: undefined,
      submittedAt: rating.submittedAt,
      approvedAt: undefined,
      approvedByUserId: undefined,
      approvedByUserName: undefined,
      response: undefined,
      responseDate: undefined,
      evaluationPeriodStart: undefined,
      evaluationPeriodEnd: undefined,
      stageReference: (rating as any)?.stageReference || undefined
    };
  }

  /**
   * 🔧 Diagnostic et debug des requêtes réseau
   */
  private debugNetworkRequests(): void {
    console.group('🔍 DEBUG: État des services');
    console.log('🆔 Stagiaire ID:', this.stagiaireId);
    console.log('🔧 Services disponibles:', {
      userService: !!this.userService,
      reportService: !!this.reportService,
      ratingService: !!this.ratingService,
      departmentService: !!this.departmentService
    });
    
    // Vérifier les méthodes disponibles du RatingService
    console.log('📊 Méthodes RatingService disponibles:', {
      getRatingsForUser: typeof this.ratingService.getRatingsForUser,
      getMyRatings: typeof this.ratingService.getMyRatings,
      getRatingsAboutMe: typeof this.ratingService.getRatingsAboutMe,
      getRatingById: typeof this.ratingService.getRatingById
    });
    
    console.groupEnd();
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        console.log('✅ Départements chargés:', departments.length);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des départements:', error);
        this.departments = [
          { id: 1, departmentName: 'IT' },
          { id: 2, departmentName: 'Finance' },
          { id: 3, departmentName: 'Comptabilité' }
        ];
      }
    });
  }

private buildStagiaireDetailedInfo(
  user: any, 
  reports: Report[], 
  ratings: RatingDetailDto[], 
  cvInfo: any
): StagiaireDetailedInfo {
  
  // 🔧 Calculer les statistiques basées sur les ÉVALUATIONS REÇUES
  // Filtrer pour ne garder que les évaluations valides (soumises ou approuvées)
  const validRatings = ratings.filter(r => {
    // Gérer les différents formats de statut possibles
    const status = typeof r.status === 'string' ? r.status : 
                   typeof r.status === 'number' ? this.getStatusFromNumber(r.status) : 'Unknown';
    
    return status === 'Submitted' || status === 'Approved';
  });
  
  const stats = {
    totalReports: reports.length,
    approvedReports: reports.filter(r => r.isApproved).length,
    pendingReports: reports.filter(r => !r.isApproved && !r.isRejected).length,
    rejectedReports: reports.filter(r => r.isRejected).length,
    averageRating: validRatings.length > 0 ? 
      Math.round((validRatings.reduce((sum, r) => sum + r.score, 0) / validRatings.length) * 100) / 100 : 0,
    totalRatings: validRatings.length,
    lastActivityDate: validRatings.length > 0 ? 
      new Date(Math.max(...validRatings.map(r => new Date(r.createdAt).getTime()))) : undefined
  };

  console.log('📊 Statistiques calculées pour le stagiaire:', {
    id: this.stagiaireId,
    totalRatings: stats.totalRatings,
    averageRating: stats.averageRating,
    validRatingsCount: validRatings.length,
    allRatingsCount: ratings.length
  });

  // Déterminer le département
  let departmentName = 'Non assigné';
  let departmentId = null;
  
  if (user.department && typeof user.department === 'object') {
    departmentId = user.department.id;
    departmentName = user.department.departmentName;
  } else if (user.departmentId) {
    departmentId = user.departmentId;
    departmentName = this.getDepartmentName(departmentId);
  }

  // Traiter les compétences
  const skillsArray = user.skills ? user.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];

  // Calculer la progression
  const progressData = this.calculateDetailedProgress(user.startDate, user.endDate);

  const stagiaireInfo: StagiaireDetailedInfo = {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    position: this.getPositionFromStage(user.stage) || 'Stagiaire',
    email: user.email,
    phone: user.phoneNumber || '+216 XX XXX XXX',
    image: this.getImageUrl(user.profilePictureUrl),
    isFavorite: false,
    role: user.role,
    statuts: user.statuts,
    
    // Académique
    universityName: user.university?.universityname || user.universityName || 'Non spécifiée',
    universityId: user.universityId,
    stage: this.formatStageType(user.stage),
    etudiant: this.formatNiveauEtude(user.etudiant),
    
    // Stage
    departmentId,
    departmentName,
    tuteurId: user.tuteurId,
    tuteurName: user.tuteur ? `${user.tuteur.firstName} ${user.tuteur.lastName}` : user.tuteurName || 'Non assigné',
    startDate: user.startDate ? new Date(user.startDate) : undefined,
    endDate: user.endDate ? new Date(user.endDate) : undefined,
    note: user.note,
    
    // Compétences et CV
    skills: user.skills,
    skillsArray,
    cvUrl: cvInfo?.cvUrl,
    cvOriginalFileName: cvInfo?.originalFileName,
    cvUploadedAt: cvInfo?.uploadedAt ? new Date(cvInfo.uploadedAt) : undefined,
    
    // Performance - CORRIGÉ pour utiliser les vraies évaluations
    progressValue: progressData.progressValue,
    isCompleted: progressData.isCompleted,
    daysRemaining: progressData.daysRemaining,
    totalDuration: progressData.totalDuration,
    
    stats,
    reports,
    ratings,
    tasks: this.generateTasks(reports)
  };

  console.log('🏗️ Objet stagiaire construit:', {
    id: stagiaireInfo.id,
    name: stagiaireInfo.name,
    reports: stagiaireInfo.reports?.length,
    ratings: stagiaireInfo.ratings?.length,
    avgRating: stagiaireInfo.stats.averageRating
  });

  return stagiaireInfo;
}
private getStatusFromNumber(status: number): string {
  switch (status) {
    case 0: return 'Draft';
    case 1: return 'Submitted';
    case 2: return 'Approved';
    case 3: return 'Rejected';
    default: return 'Unknown';
  }
}

  private calculateDetailedProgress(startDate?: string | Date, endDate?: string | Date) {
    const result = {
      progressValue: 0,
      isCompleted: false,
      daysRemaining: undefined as number | undefined,
      totalDuration: undefined as number | undefined
    };

    if (!startDate || !endDate) return result;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    const remainingMs = end.getTime() - now.getTime();

    result.totalDuration = Math.ceil(totalMs / (1000 * 60 * 60 * 24)); // Jours total
    result.daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    result.isCompleted = now >= end;
    
    if (now < start) {
      result.progressValue = 0;
    } else if (now >= end) {
      result.progressValue = 100;
    } else {
      result.progressValue = Math.round((elapsedMs / totalMs) * 100);
    }

    return result;
  }

  private generateTasks(reports: Report[]): TaskItem[] {
    const tasks: TaskItem[] = [];
    
    // Tâches basées sur les rapports attendus
    const expectedReports = [
      { title: 'Convention de stage', type: 'Convention de stage', priority: 'high' as const },
      { title: 'Plan de travail', type: 'Plan de travail', priority: 'high' as const },
      { title: 'Journal de bord', type: 'Journal de bord', priority: 'medium' as const },
      { title: 'Rapport mi-parcours', type: 'Présentation mi-terme', priority: 'medium' as const },
      { title: 'Rapport final', type: 'Rapport final', priority: 'high' as const }
    ];

    expectedReports.forEach((expectedReport, index) => {
      const existingReport = reports.find(r => 
        r.reportTypeName?.includes(expectedReport.type) || 
        r.title?.includes(expectedReport.title)
      );

      let status: 'completed' | 'in-progress' | 'pending' | 'overdue' = 'pending';
      let completedDate: Date | undefined;

      if (existingReport) {
        if (existingReport.isApproved) {
          status = 'completed';
          completedDate = existingReport.submissionDate;
        } else if (existingReport.isRejected) {
          status = 'in-progress';
        } else {
          status = 'in-progress';
        }
      }

      tasks.push({
        id: index + 1,
        title: expectedReport.title,
        description: `Soumission et validation du ${expectedReport.title.toLowerCase()}`,
        status,
        priority: expectedReport.priority,
        completedDate,
        relatedReport: existingReport
      });
    });

    return tasks;
  }

  // Méthodes utilitaires
  getDepartmentName(departmentId?: number): string {
    if (!departmentId) return 'Non assigné';
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.departmentName : 'Non assigné';
  }

  getImageUrl(relativeUrl: string | null | undefined): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${environment.apiUrl}${relativeUrl}`;
  }

  getPositionFromStage(stage: any): string {
    if (!stage) return 'Stagiaire';
    
    if (typeof stage === 'string') {
      return stage === 'stage_été' ? 'Stagiaire d\'été' : 
             stage === 'stage_pfe' ? 'Stagiaire PFE' : 
             'Stagiaire';
    }
    
    return 'Stagiaire';
  }

  formatStageType(stage: any): string {
    if (!stage) return 'Non spécifié';
    
    if (typeof stage === 'string') {
      return stage === 'stage_été' ? 'Stage d\'été' : 
             stage === 'stage_pfe' ? 'Stage PFE' : 
             stage;
    } else if (typeof stage === 'number') {
      return stage === 0 ? 'Stage d\'été' : 
             stage === 1 ? 'Stage PFE' : 
             'Non spécifié';
    }
    
    return 'Non spécifié';
  }

  formatNiveauEtude(etudiant: any): string {
    if (!etudiant) return 'Non spécifié';
    
    if (typeof etudiant === 'string') {
      return etudiant === 'ingénierie' ? 'Ingénierie' :
             etudiant === 'licence' ? 'Licence' :
             etudiant === 'master' ? 'Master' :
             etudiant;
    } else if (typeof etudiant === 'number') {
      return etudiant === 0 ? 'Ingénierie' :
             etudiant === 1 ? 'Licence' :
             etudiant === 2 ? 'Master' :
             'Non spécifié';
    }
    
    return 'Non spécifié';
  }

  /**
   * 📢 Afficher un message d'erreur à l'utilisateur
   */
  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  // Actions utilisateur
  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }

  toggleFavorite(): void {
    if (this.stagiaire) {
      this.stagiaire.isFavorite = !this.stagiaire.isFavorite;
      const message = this.stagiaire.isFavorite 
        ? `${this.stagiaire.name} ajouté aux favoris`
        : `${this.stagiaire.name} retiré des favoris`;
      
      this.snackBar.open(message, 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    }
  }

  contactStagiaire(): void {
    if (this.stagiaire) {
      window.location.href = `mailto:${this.stagiaire.email}`;
    }
  }

  callStagiaire(): void {
    if (this.stagiaire) {
      window.location.href = `tel:${this.stagiaire.phone.replace(/\s/g, '')}`;
    }
  }

  downloadCv(): void {
    if (this.stagiaire?.cvUrl) {
      this.userService.downloadUserCv(this.stagiaireId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.stagiaire?.cvOriginalFileName || `cv_${this.stagiaire?.name}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.snackBar.open('Erreur lors du téléchargement du CV', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
        }
      });
    }
  }

  viewReport(report: Report): void {
    // Implémenter la visualisation du rapport
    this.router.navigate(['/reports', report.id]);
  }

  downloadReport(report: Report): void {
    this.reportService.downloadReport(report.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.title}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.snackBar.open('Erreur lors du téléchargement du rapport', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'task-completed';
      case 'in-progress': return 'task-in-progress';
      case 'pending': return 'task-pending';
      case 'overdue': return 'task-overdue';
      default: return 'task-pending';
    }
  }

  getTaskStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'in-progress': return 'pending';
      case 'pending': return 'schedule';
      case 'overdue': return 'error';
      default: return 'help';
    }
  }

  getPriorityColor(priority: string): 'warn' | 'accent' | 'primary' {
    switch (priority) {
      case 'high': return 'warn';
      case 'medium': return 'accent';
      case 'low': return 'primary';
      default: return 'primary';
    }
  }

  getStatusChipClass(status: boolean): string {
    return status ? 'status-active' : 'status-inactive';
  }

  getProgressColor(): string {
    if (!this.stagiaire) return 'primary';
    
    if (this.stagiaire.progressValue >= 90) return 'accent';
    if (this.stagiaire.progressValue >= 70) return 'primary';
    if (this.stagiaire.progressValue >= 40) return 'warn';
    return 'warn';
  }

  // Méthodes pour les calculs de template
  getCompletedTasksPercentage(): number {
    if (!this.stagiaire?.tasks || this.stagiaire.tasks.length === 0) {
      return 0;
    }
    const completedTasks = this.stagiaire.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / this.stagiaire.tasks.length) * 100);
  }

  getCompletedTasksCount(): number {
    return this.stagiaire?.tasks?.filter(t => t.status === 'completed').length || 0;
  }

  getTotalTasksCount(): number {
    return this.stagiaire?.tasks?.length || 0;
  }

  getStarArray(rating: number): boolean[] {
    const stars: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating));
    }
    return stars;
  }

  isStarFilled(index: number, rating: number): boolean {
    return index < Math.round(rating);
  }

  getCriteriaItems(detailedScores: any): Array<{name: string, value: number}> {
    if (!detailedScores) return [];
    
    const criteria = [];
    if (detailedScores.technicalSkills) {
      criteria.push({ name: 'Compétences techniques', value: detailedScores.technicalSkills });
    }
    if (detailedScores.communication) {
      criteria.push({ name: 'Communication', value: detailedScores.communication });
    }
    if (detailedScores.teamwork) {
      criteria.push({ name: 'Travail d\'équipe', value: detailedScores.teamwork });
    }
    if (detailedScores.initiative) {
      criteria.push({ name: 'Initiative', value: detailedScores.initiative });
    }
    return criteria;
  }

  getEvaluationTypeDisplay(type: EvaluationType): string {
    switch (type) {
      case EvaluationType.TuteurToStagiaire:
        return 'Évaluation Tuteur';
      case EvaluationType.RHToStagiaire:
        return 'Évaluation RH';
      case EvaluationType.StagiaireToTuteur:
        return 'Évaluation Stagiaire';
      default:
        return 'Évaluation';
    }
  }

  getEvaluationIcon(type: EvaluationType): string {
    switch (type) {
      case EvaluationType.TuteurToStagiaire:
        return 'person';
      case EvaluationType.RHToStagiaire:
        return 'business';
      case EvaluationType.StagiaireToTuteur:
        return 'school';
      default:
        return 'star';
    }
  }

  getReportStatusClass(report: Report): string {
    if (report.isApproved) return 'avatar-approved';
    if (report.isRejected) return 'avatar-rejected';
    return 'avatar-pending';
  }

  getReportStatusIcon(report: Report): string {
    if (report.isApproved) return 'check';
    if (report.isRejected) return 'close';
    return 'schedule';
  }

  getReportStatusText(report: Report): string {
    if (report.isApproved) return 'Approuvé';
    if (report.isRejected) return 'Rejeté';
    return 'En attente';
  }

  getReportStatusChipClass(report: Report): string {
    if (report.isApproved) return 'status-approved';
    if (report.isRejected) return 'status-rejected';
    return 'status-pending';
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return 'Normale';
    }
  }

  // 🔧 Méthode de debug pour vérifier les données chargées
  debugStagiaireData(): void {
    console.group('🔍 DEBUG: Données du stagiaire chargées');
    console.log('🆔 ID du stagiaire:', this.stagiaireId);
    console.log('📋 Données complètes:', this.stagiaire);
    
    if (this.stagiaire) {
      console.log('📊 Statistiques:', this.stagiaire.stats);
      console.log('⭐ Évaluations:', this.stagiaire.ratings?.length, this.stagiaire.ratings);
      console.log('📝 Rapports:', this.stagiaire.reports?.length, this.stagiaire.reports);
      console.log('📋 Tâches:', this.stagiaire.tasks?.length);
      
      if (this.stagiaire.ratings && this.stagiaire.ratings.length > 0) {
        console.log('🎯 Détail des évaluations:', this.stagiaire.ratings.map(r => ({
          id: r.id,
          score: r.score,
          evaluator: r.evaluatorName,
          type: r.type,
          comment: r.comment?.substring(0, 50) + '...'
        })));
        
        const avgCalculated = this.stagiaire.ratings.reduce((sum, r) => sum + r.score, 0) / this.stagiaire.ratings.length;
        console.log('📐 Moyenne calculée manuellement:', avgCalculated.toFixed(2));
        console.log('📐 Moyenne dans stats:', this.stagiaire.stats.averageRating.toFixed(2));
      }
      
      if (this.stagiaire.reports && this.stagiaire.reports.length > 0) {
        console.log('📝 Détail des rapports:', this.stagiaire.reports.map(r => ({
          id: r.id,
          title: r.title,
          type: r.reportTypeName,
          approved: r.isApproved,
          rejected: r.isRejected,
          date: r.submissionDate
        })));
      }
    }
    
    console.log('🏁 État du chargement:', {
      isLoading: this.isLoading,
      error: this.error,
      retryCount: this.retryCount
    });
    
    console.groupEnd();
  }

  // Appelée après le chargement pour debug
  ngAfterViewInit(): void {
    // Debug après que la vue soit initialisée
    setTimeout(() => {
      if (this.stagiaire && !this.isLoading) {
        this.debugStagiaireData();
      }
    }, 1000);
  }

  // Données de secours en cas d'échec total
  private loadFallbackData(): void {
    console.log('🔄 Chargement des données de secours...');
    
    this.stagiaire = {
      id: this.stagiaireId,
      name: 'Utilisateur Inconnu',
      firstName: 'Utilisateur',
      lastName: 'Inconnu',
      username: `user_${this.stagiaireId}`,
      position: 'Stagiaire',
      email: 'inconnu@example.com',
      phone: '+216 XX XXX XXX',
      image: 'assets/images/default-profile.jpg',
      isFavorite: false,
      role: 'Stagiaire',
      statuts: true,
      
      universityName: 'Non spécifiée',
      stage: 'Non spécifié',
      etudiant: 'Non spécifié',
      
      departmentId: undefined,
      departmentName: 'Non assigné',
      tuteurId: undefined,
      tuteurName: 'Non assigné',
      startDate: undefined,
      endDate: undefined,
      note: undefined,
      
      skillsArray: [],
      cvUrl: undefined,
      cvOriginalFileName: undefined,
      cvUploadedAt: undefined,
      
      progressValue: 0,
      isCompleted: false,
      daysRemaining: undefined,
      totalDuration: undefined,
      
      stats: {
        totalReports: 0,
        approvedReports: 0,
        pendingReports: 0,
        rejectedReports: 0,
        averageRating: 0,
        totalRatings: 0,
        lastActivityDate: undefined
      },
      
      reports: [],
      ratings: [],
      tasks: []
    };
    
    console.log('🔄 Données de secours chargées');
  }
}