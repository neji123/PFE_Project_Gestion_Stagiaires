import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RatingService, RatingListDto, RatingStatsDto, EvaluationType, RatingStatus } from '../../../services/Rating/rating.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { combineLatest, Subject, takeUntil, catchError, of, finalize, debounceTime } from 'rxjs'; // 🔧 Ajout de debounceTime

@Component({
  selector: 'app-rating-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rating-dashboard.component.html',
  styleUrls: ['./rating-dashboard.component.scss']
})
export class RatingDashboardComponent implements OnInit, OnDestroy {
  private ratingService = inject(RatingService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // 🔧 Signals pour l'état réactif - CORRIGÉS
  userStats = signal<RatingStatsDto | null>(null);
  myRatings = signal<RatingListDto[]>([]);
  ratingsAboutMe = signal<RatingListDto[]>([]);
  draftRatings = signal<RatingListDto[]>([]); // 🔧 AJOUTÉ
  isLoading = signal(true);
  error = signal<string | null>(null);
  lastUpdateTime = signal<Date | null>(null); // 🔧 AJOUTÉ
showDeleteConfirmation = signal(false);
  ratingToDelete = signal<RatingListDto | null>(null);
  isDeleting = signal(false);
  // 🔧 Computed properties
  currentUser = computed(() => this.authService.currentUserValue);
  hasNoData = computed(() => 
    !this.isLoading() && 
    this.myRatings().length === 0 && 
    this.ratingsAboutMe().length === 0
  );

  ngOnInit() {
    this.isLoading.set(true);
    
    // 🔧 Charger les données essentielles d'abord
    combineLatest([
      this.ratingService.myRatings$,
      this.ratingService.ratingsAboutMe$,
      this.ratingService.draftRatings$
    ]).pipe(
      takeUntil(this.destroy$),
      debounceTime(300) // 🔧 Éviter les mises à jour trop fréquentes
    ).subscribe({
      next: ([myRatings, ratingsAboutMe, draftRatings]) => {
        this.myRatings.set(myRatings || []);
        this.ratingsAboutMe.set(ratingsAboutMe || []);
        this.draftRatings.set(draftRatings || []); // 🔧 CORRIGÉ
        this.isLoading.set(false);
        this.lastUpdateTime.set(new Date());
        
        console.log('📊 Dashboard chargé:', {
          myRatingsCount: myRatings?.length || 0,
          ratingsAboutMeCount: ratingsAboutMe?.length || 0,
          draftRatingsCount: draftRatings?.length || 0
        });
      },
      error: (error) => {
        console.error('❌ Erreur chargement dashboard:', error);
        this.error.set('Erreur lors du chargement du tableau de bord'); // 🔧 CORRIGÉ
        this.isLoading.set(false);
      }
    });

    // 🔧 Charger les stats séparément (optionnel)
    this.ratingService.userStats$.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.warn('⚠️ Stats non disponibles:', error);
        return of(null); // Continuer sans les stats
      })
    ).subscribe(stats => {
      this.userStats.set(stats); // 🔧 CORRIGÉ : userStats au lieu de stats
    });

    // 🔧 Démarrer le chargement initial
    this.loadInitialData();
  }

  private loadInitialData() {
    // Charger seulement les données critiques
    this.ratingService.getMyRatings(undefined, true).subscribe();
    this.ratingService.getRatingsAboutMe(true).subscribe();
    this.ratingService.getDraftRatings(true).subscribe();
    
    // Essayer de charger les stats (optionnel)
    this.ratingService.getMyRatingStats(true).subscribe(); // Ne fera pas échouer grâce au catchError
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * 📊 Chargement des données du dashboard
   */
  private loadDashboardData() {
    this.isLoading.set(true);
    this.error.set(null);

    // Charger toutes les données en parallèle
    combineLatest([
      this.ratingService.getMyRatingStats().pipe(
        catchError(error => {
          console.error('Erreur stats:', error);
          return of(null);
        })
      ),
      this.ratingService.getMyRatings().pipe(
        catchError(error => {
          console.error('Erreur mes évaluations:', error);
          return of([]);
        })
      ),
      this.ratingService.getRatingsAboutMe().pipe(
        catchError(error => {
          console.error('Erreur évaluations me concernant:', error);
          return of([]);
        })
      )
    ]).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: ([stats, myRatings, ratingsAboutMe]) => {
        this.userStats.set(stats);
        this.myRatings.set(myRatings);
        this.ratingsAboutMe.set(ratingsAboutMe);
        
        console.log('📊 Dashboard chargé:', {
          stats: stats,
          myRatingsCount: myRatings.length,
          ratingsAboutMeCount: ratingsAboutMe.length
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du dashboard:', error);
        this.error.set('Erreur lors du chargement des données. Veuillez réessayer.');
      }
    });
  }

  /**
   * 🔄 Configuration du rafraîchissement automatique
   */
  private setupAutoRefresh() {
    // Rafraîchir les données toutes les 5 minutes
    setInterval(() => {
      if (!this.isLoading()) {
        this.refreshData();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 🔄 Rafraîchissement manuel des données
   */
  refreshData() {
    console.log('🔄 Rafraîchissement des données...');
    this.ratingService.refreshData();
    this.loadDashboardData();
  }

  // 🧭 Méthodes de navigation (CORRIGÉES)
  
  /**
   * ➕ Navigation vers création d'évaluation
   */
  navigateToCreate() {
    console.log('🧭 Navigation vers création d\'évaluation');
    this.router.navigate(['/ratings/create']);
  }

  /**
   * 📝 Navigation vers mes évaluations
   */
  navigateToMyRatings() {
    console.log('🧭 Navigation vers mes évaluations');
    this.scrollToSection('my-ratings-section');
  }

  /**
   * 👁️ Navigation vers évaluations me concernant
   */
  navigateToAboutMe() {
    console.log('🧭 Navigation vers évaluations me concernant');
    this.scrollToSection('about-me-section');
  }

  /**
   * 📄 Navigation vers les brouillons
   */
  navigateToDrafts() {
    console.log('🧭 Navigation vers les brouillons');
    this.router.navigate(['/ratings'], { 
      queryParams: { filter: 'drafts' } 
    });
  }

  /**
   * ✏️ Navigation vers édition d'évaluation
   */
  navigateToEdit(ratingId: number) {
    console.log(`🧭 Navigation vers édition évaluation ${ratingId}`);
    this.router.navigate(['/ratings/edit', ratingId]);
  }

  /**
   * 👁️ Navigation vers détails d'évaluation
   */
  navigateToDetails(ratingId: number) {
    console.log(`🧭 Navigation vers détails évaluation ${ratingId}`);
    this.router.navigate(['/ratings/detail', ratingId]);
  }

  /**
   * 📜 Scroll vers une section spécifique
   */
  private scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  // 🎨 Méthodes utilitaires pour l'affichage

  /**
   * 🏷️ Obtenir le libellé du type d'évaluation
   */
  getEvaluationTypeLabel(type: EvaluationType): string {
    return this.ratingService.getEvaluationTypeLabel(type);
  }

  /**
   * 🏷️ Obtenir le badge de statut
   */
  getStatusBadge(status: RatingStatus) {
    return this.ratingService.getStatusBadge(status);
  }

  /**
   * 🎭 Obtenir la couleur du score
   */
  getScoreColor(score: number): string {
    return this.ratingService.getScoreColor(score);
  }

  /**
   * 📊 Obtenir le pourcentage de progression
   */
  getCompletionPercentage(): number {
    const stats = this.userStats();
    if (!stats || stats.totalRatings === 0) return 0;
    
    return Math.round((stats.approvedRatings / stats.totalRatings) * 100);
  }

  /**
   * 🎯 Vérifier si l'utilisateur peut créer une évaluation
   */
  canCreateRating(): boolean {
    const user = this.currentUser();
    return user && ['Tuteur', 'RHs', 'Stagiaire'].includes(user.role);
  }

  /**
   * 🔍 Filtrer les évaluations par statut
   */
  filterRatingsByStatus(ratings: RatingListDto[], status: RatingStatus): RatingListDto[] {
    return ratings.filter(rating => rating.status === status);
  }

  /**
   * ⭐ Obtenir la moyenne des scores
   */
  getAverageScore(ratings: RatingListDto[]): number {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }

 

  /**
   * 📈 Actions rapides du dashboard
   */
  quickActions = {
    createEvaluation: () => this.navigateToCreate(),
    viewDrafts: () => this.navigateToDrafts(),
    exportData: () => this.exportDashboardData(),
    refreshData: () => this.refreshData()
  };

  /**
   * 📤 Export des données du dashboard
   */
  private exportDashboardData() {
    console.log('📤 Export des données du dashboard');
    const data = {
      stats: this.userStats(),
      myRatings: this.myRatings(),
      ratingsAboutMe: this.ratingsAboutMe(),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-evaluations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 📅 Obtenir le temps relatif depuis une date
   */
  getRelativeTime(date: Date | string): string {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine${Math.floor(days / 7) > 1 ? 's' : ''}`;
    
    return this.formatDate(date);
  }

  /**
   * 📅 Formatage des dates
   */
  formatDate(date: Date | string): string {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * 🎨 Obtenir la classe CSS selon le score
   */
  getScoreClass(score: number): string {
    if (score >= 4.5) return 'score-excellent';
    if (score >= 3.5) return 'score-good';
    if (score >= 2.5) return 'score-average';
    return 'score-poor';
  }

  /**
   * ⭐ Obtenir le libellé textuel du score
   */
  getScoreText(score: number): string {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Bien';
    if (score >= 2.5) return 'Moyen';
    if (score >= 1.5) return 'Faible';
    return 'Très faible';
  }

  /**
   * 🔍 Filtrer et trier les évaluations par date
   */
  sortRatingsByDate(ratings: RatingListDto[]): RatingListDto[] {
    return [...ratings].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Plus récent en premier
    });
  }

  /**
   * 🎯 Vérifier si l'utilisateur peut voir les détails
   */
  canViewDetails(rating: RatingListDto): boolean {
    const currentUser = this.currentUser();
    if (!currentUser) return false;
    
    return currentUser.role === 'Admin' || 
           currentUser.role === 'RHs' ||
           rating.evaluatorName === `${currentUser.firstName} ${currentUser.lastName}` ||
           rating.evaluatedUserName === `${currentUser.firstName} ${currentUser.lastName}`;
  }

  /**
   * 🎭 Animation staggerée pour les éléments
   */
  getAnimationDelay(index: number): string {
    return `${index * 0.1}s`;
  }

  /**
   * 📊 Obtenir les statistiques résumées
   */
  getSummaryStats() {
    const stats = this.userStats();
    if (!stats) return null;
    
    return {
      completion: stats.totalRatings > 0 ? 
        Math.round((stats.approvedRatings / stats.totalRatings) * 100) : 0,
      trend: this.calculateTrend(),
      mostRecentScore: this.getMostRecentScore()
    };
  }

  /**
   * 📈 Calculer la tendance des scores
   */
  private calculateTrend(): 'up' | 'down' | 'stable' {
    const myRatings = this.myRatings();
    if (myRatings.length < 2) return 'stable';
    
    const recent = myRatings.slice(0, 3);
    const older = myRatings.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.score, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.2) return 'up';
    if (recentAvg < olderAvg - 0.2) return 'down';
    return 'stable';
  }

  /**
   * ⭐ Obtenir le score le plus récent
   */
  private getMostRecentScore(): number | null {
    const ratings = this.myRatings();
    return ratings.length > 0 ? ratings[0].score : null;
  }

  /**
 * 📈 Texte de progression adapté au rôle
 */
getProgressText(stats: RatingStatsDto): string {
  const user = this.currentUser();
  if (!user) return '';
  
  if (user.role === 'Stagiaire') {
    return stats.totalRatings > 0 ? `${stats.approvedRatings} validées` : 'Première évaluation bientôt';
  } else {
    return stats.totalRatings > 0 ? `${stats.approvedRatings} approuvées` : 'Commencer à évaluer';
  }
}

/**
 * 🎯 Classe CSS pour la tendance des scores
 */
getScoreTrendClass(score: number): string {
  if (score >= 4) return 'trend-indicator--up';
  if (score >= 3) return 'trend-indicator--neutral';
  return 'trend-indicator--down';
}

/**
 * 📊 Flèche de tendance pour les scores
 */
getScoreTrendArrow(score: number): string {
  if (score >= 4) return '🚀';
  if (score >= 3) return '➡️';
  return '📉';
}

/**
 * 🎨 Classe d'icône selon le score
 */
getScoreIconClass(score: number): string {
  if (score >= 4.5) return 'stat-card__icon--excellent';
  if (score >= 3.5) return 'stat-card__icon--success';
  if (score >= 2.5) return 'stat-card__icon--warning';
  return 'stat-card__icon--danger';
}

/**
 * ⏳ Texte pour les évaluations en attente
 */
getPendingText(pending: number): string {
  if (pending === 0) return 'Tout à jour';
  if (pending === 1) return 'À traiter';
  return `${pending} à traiter`;
}

/**
 * 📝 Texte pour les brouillons
 */
getDraftText(drafts: number): string {
  if (drafts === 0) return 'Aucun brouillon';
  if (drafts === 1) return 'Terminer';
  return `${drafts} à terminer`;
}

/**
 * 📈 Classe de tendance générale
 */
getTrendClass(current: number, previous: number): string {
  if (current > previous) return 'trend-indicator--up';
  if (current < previous) return 'trend-indicator--down';
  return 'trend-indicator--neutral';
}

/**
 * 🎯 Flèche de tendance
 */
getTrendArrow(current: number, previous: number): string {
  if (current > previous) return '↗';
  if (current < previous) return '↘';
  return '→';
}

/**
 * ✏️ Vérifier si une évaluation peut être modifiée - VERSION CORRIGÉE
 */
canEditRating(rating: RatingListDto): boolean {
  const currentUser = this.currentUser();
  if (!currentUser) return false;
  
  // Dans la section "Mes évaluations", tous les ratings sont à moi
  // Je peux modifier les brouillons ET les soumis
  return rating.status === RatingStatus.Draft || rating.status === RatingStatus.Submitted;
}
/**
 * 👤 Vérifier si c'est mon évaluation par ID - VERSION CORRIGÉE
 */
private isMyRating(rating: RatingListDto): boolean {
  // Si l'évaluation apparaît dans "Mes évaluations", 
  // c'est qu'elle vient de myRatings() donc elle est à moi
  return true;
}

  /**
   * ✏️ Modifier une évaluation
   */
 editRating(event: Event, ratingId: number) {
  event.stopPropagation(); 
  console.log(`✏️ Navigation vers édition ${ratingId}`);
  
  // SEULEMENT navigation - PAS de sauvegarde
  this.router.navigate(['/ratings/edit', ratingId]);
}

  /**
   * 🗑️ Demander confirmation pour supprimer une évaluation
   */
  confirmDeleteRating(event: Event, rating: RatingListDto) {
    event.stopPropagation(); // Empêcher la navigation vers les détails
    console.log(`🗑️ Demande de suppression de l'évaluation ${rating.id}`);
    
    this.ratingToDelete.set(rating);
    this.showDeleteConfirmation.set(true);
  }

  /**
   * ❌ Annuler la suppression
   */
  cancelDelete() {
    console.log('❌ Suppression annulée');
    this.showDeleteConfirmation.set(false);
    this.ratingToDelete.set(null);
    this.isDeleting.set(false);
  }
  /**
 * 🗑️ Vérifier si une évaluation peut être supprimée  
 */
canDeleteRating(rating: RatingListDto): boolean {
  const currentUser = this.currentUser();
  if (!currentUser) return false;
  
  // 🆕 Permettre la suppression des brouillons ET des soumis
  // Seulement par leur créateur
  return (rating.status === RatingStatus.Draft || rating.status === RatingStatus.Submitted) && 
         this.isMyRating(rating);
}

  /**
   * ✅ Confirmer la suppression
   */
  confirmDelete() {
    const rating = this.ratingToDelete();
    if (!rating) return;
    
    console.log(`✅ Confirmation de suppression de l'évaluation ${rating.id}`);
    this.isDeleting.set(true);
    
    this.ratingService.deleteRating(rating.id).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isDeleting.set(false);
        this.showDeleteConfirmation.set(false);
        this.ratingToDelete.set(null);
      })
    ).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Évaluation supprimée avec succès');
          this.showSuccessMessage('Évaluation supprimée avec succès');
          this.refreshData();
        } else {
          console.error('❌ Échec de la suppression');
          this.showErrorMessage('Erreur lors de la suppression de l\'évaluation');
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression:', error);
        this.showErrorMessage(`Erreur: ${error.message || 'Impossible de supprimer l\'évaluation'}`);
      }
    });
  }

  /**
   * ✅ Afficher un message de succès
   */
  private showSuccessMessage(message: string) {
    this.showNotification(message, 'success');
  }

  /**
   * ❌ Afficher un message d'erreur
   */
  private showErrorMessage(message: string) {
    this.showNotification(message, 'error');
  }
   /**
   * 📢 Système de notification simple
   */
  private showNotification(message: string, type: 'success' | 'error') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification__content">
        <span class="notification__icon">${type === 'success' ? '✅' : '❌'}</span>
        <span class="notification__message">${message}</span>
      </div>
      <button class="notification__close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 300px;
      padding: 16px;
      border-radius: 8px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: inherit;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);
  }
}