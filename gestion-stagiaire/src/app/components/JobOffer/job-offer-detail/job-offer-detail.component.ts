// job-offer-detail.component.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService, JobOfferDto } from '../../../services/JobOffer/job-offer.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { 
  RecommendationService, 
  StagiaireRecommendation, 
  RecommendationResponse,
  JobOfferWithRecommendations 
} from '../../../services/Recommendation/recommendation.service';

@Component({
  selector: 'app-job-offer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './job-offer-detail.component.html',
  styleUrls: ['./job-offer-detail.component.scss']
})
export class JobOfferDetailComponent implements OnInit {
  // Injection des services
  private jobOfferService = inject(JobOfferService);
  private authService = inject(AuthService);
  private recommendationService = inject(RecommendationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals pour la gestion d'état
  jobOffer = signal<JobOfferDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal(false);
  currentUser = signal<any>(null);

  // ✨ NOUVEAUX SIGNALS POUR LES RECOMMANDATIONS
  recommendations = signal<StagiaireRecommendation[]>([]);
  loadingRecommendations = signal(false);
  showRecommendations = signal(false);
  recommendationError = signal<string | null>(null);
  generatingRecommendations = signal(false);

  displayedCount = signal(3); // Commence par afficher 6 recommendations
pageSize = signal(3); // Charge 3 de plus à chaque fois
// Computed pour les recommendations affichées
displayedRecommendations = computed(() => {
  return this.recommendations().slice(0, this.displayedCount());
});

// Computed pour savoir s'il y a plus d'éléments
hasMoreRecommendations = computed(() => {
  return this.displayedCount() < this.recommendations().length;
});

// Signal pour l'état de chargement
loadingMore = signal(false);

// Méthode pour charger plus
async loadMoreRecommendations() {
  this.loadingMore.set(true);
  
  // Simulation d'un délai de chargement
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newCount = this.displayedCount() + this.pageSize();
  this.displayedCount.set(Math.min(newCount, this.recommendations().length));
  
  this.loadingMore.set(false);
}





  // Computed values existants
  skills = computed(() => {
    const offer = this.jobOffer();
    return offer ? this.jobOfferService.formatSkills(offer.requiredSkills) : [];
  });

  publishedDate = computed(() => {
    const offer = this.jobOffer();
    return offer ? this.jobOfferService.formatPublishedDate(offer.publishedAt) : '';
  });

  canEdit = computed(() => {
    const offer = this.jobOffer();
    const user = this.currentUser();
    return user && offer && (
      offer.publishedByUserId === user.id || 
      user.role === 'Admin'
    );
  });

  canDelete = computed(() => {
    const offer = this.jobOffer();
    const user = this.currentUser();
    return user && offer && (
      offer.publishedByUserId === user.id || 
      user.role === 'Admin'
    );
  });

  // ✨ NOUVEAUX COMPUTED POUR LES RECOMMANDATIONS
  canGenerateRecommendations = computed(() => {
    const user = this.currentUser();
    return this.recommendationService.canGenerateRecommendations(user?.role || '');
  });

  hasRecommendations = computed(() => {
    return this.recommendations().length > 0;
  });

  topRecommendations = computed(() => {
    return this.recommendations().slice(0, 3);
  });

  bestMatch = computed(() => {
    const recs = this.recommendations();
    return recs.length > 0 ? recs[0] : null;
  });

  ngOnInit() {
    this.loadCurrentUser();
    this.loadJobOffer();
  }

  private loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
      }
    });
  }

  private loadJobOffer() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID d\'offre manquant');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.jobOfferService.getJobOfferById(+id).subscribe({
      next: (offer) => {
        this.jobOffer.set(offer);
        this.loading.set(false);
        console.log('✅ Offre chargée:', offer);

        // Vérifier s'il y a déjà des recommandations
        this.checkExistingRecommendations(+id);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement de l\'offre:', error);
        this.error.set('Impossible de charger l\'offre d\'emploi');
        this.loading.set(false);
      }
    });
  }

  // ✨ NOUVELLES MÉTHODES POUR LES RECOMMANDATIONS

  /**
   * Vérifie s'il y a déjà des recommandations pour cette offre
   */
  private checkExistingRecommendations(jobOfferId: number) {
    if (!this.canGenerateRecommendations()) return;

    this.recommendationService.getJobOfferWithRecommendations(jobOfferId).subscribe({
      next: (jobOfferWithRecs) => {
        if (jobOfferWithRecs.recommendationsGenerated && jobOfferWithRecs.recommendations.length > 0) {
          // Convertir les DTOs en format StagiaireRecommendation
          const recs: StagiaireRecommendation[] = jobOfferWithRecs.recommendations.map(dto => ({
            stagiaireId: dto.stagiaireId,
            name: dto.stagiaireName,
            email: dto.stagiaireEmail,
            skills: dto.skills,
            department: dto.department,
            university: dto.university,
            stagePeriod: '', // Pas disponible dans le DTO
            rating: 0, // Pas disponible dans le DTO
            compositeScore: dto.compositeScore,
            textSimilarity: dto.textSimilarity,
            skillSimilarity: dto.skillSimilarity,
            departmentMatch: dto.departmentMatch,
            matchReasons: dto.matchReasons
          }));

          this.recommendations.set(recs);
          console.log(`📋 ${recs.length} recommandations existantes trouvées`);
        }
      },
      error: (error) => {
        console.log('ℹ️ Aucune recommandation existante:', error);
      }
    });
  }

  /**
   * Génère des recommandations IA pour cette offre
   */
  generateRecommendations() {
    const offer = this.jobOffer();
    if (!offer || !this.canGenerateRecommendations()) return;

    this.generatingRecommendations.set(true);
    this.recommendationError.set(null);

    const request = {
      jobOfferId: offer.id,
      topN: 3,
      regenerateIfExists: true
    };

    this.recommendationService.generateRecommendations(request).subscribe({
      next: (response: RecommendationResponse) => {
        this.generatingRecommendations.set(false);
        
        if (response.success) {
          this.recommendations.set(response.recommendations);
          this.showRecommendations.set(true);
          console.log(`🎯 ${response.totalFound} recommandations générées`);
        } else {
          this.recommendationError.set(response.error || 'Erreur lors de la génération');
        }
      },
      error: (error) => {
        this.generatingRecommendations.set(false);
        this.recommendationError.set('Service de recommandation indisponible');
        console.error('❌ Erreur génération recommandations:', error);
      }
    });
  }

  /**
   * Affiche/Cache les recommandations
   */
  toggleRecommendations() {
    if (this.hasRecommendations()) {
      this.showRecommendations.update(show => !show);
    } else {
      this.generateRecommendations();
    }
  }

  /**
   * Marque une recommandation comme vue
   */
  markRecommendationAsViewed(recommendation: StagiaireRecommendation) {
    // Cette fonctionnalité nécessiterait l'ID de la recommandation en base
    // Pour l'instant, on peut juste logger
    console.log('👁️ Recommandation vue:', recommendation.name);
  }

  /**
   * Contacte un candidat recommandé
   */
  contactCandidate(recommendation: StagiaireRecommendation) {
    const offer = this.jobOffer();
    if (!offer) return;

    const emailLink = this.recommendationService.generateEmailLink(recommendation, offer.title);
    window.open(emailLink);

    // Marquer comme contacté
    console.log('📧 Contact candidat:', recommendation.name);
  }

  /**
   * Sélectionne un candidat
   */
  selectCandidate(recommendation: StagiaireRecommendation) {
    const confirmed = confirm(
      `Voulez-vous sélectionner ${recommendation.name} pour ce poste ?\n\n` +
      `Score de compatibilité: ${this.recommendationService.formatScore(recommendation.compositeScore)}`
    );

    if (confirmed) {
      console.log('⭐ Candidat sélectionné:', recommendation.name);
      // Ici vous pourriez appeler l'API pour marquer comme sélectionné
    }
  }

  // Méthodes existantes (inchangées)
  editOffer() {
    const offer = this.jobOffer();
    if (offer) {
      this.router.navigate(['/job-offers/edit', offer.id]);
    }
  }

  async deleteOffer() {
    const offer = this.jobOffer();
    if (!offer) return;

    const confirmed = confirm(
      `Êtes-vous sûr de vouloir supprimer l'offre "${offer.title}" ?\n\nCette action est irréversible.`
    );

    if (!confirmed) return;

    this.deleting.set(true);

    try {
      await this.jobOfferService.deleteJobOffer(offer.id).toPromise();
      console.log('✅ Offre supprimée avec succès');
      this.router.navigate(['/job-offers']);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      this.error.set('Erreur lors de la suppression de l\'offre');
      this.deleting.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/job-offers']);
  }

  refreshOffer() {
    this.loadJobOffer();
  }

  // Utilitaires pour les recommandations
  formatScore(score: number): string {
    return this.recommendationService.formatScore(score);
  }

  getScoreClass(score: number): string {
    return this.recommendationService.getScoreClass(score);
  }

  formatSkillsArray(skills: string): string[] {
    return this.recommendationService.formatSkills(skills);
  }

  // Utilitaires existants
  copyOfferUrl() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      console.log('✅ URL copiée dans le presse-papiers');
    }).catch(err => {
      console.error('❌ Erreur lors de la copie:', err);
    });
  }

  printOffer() {
    window.print();
  }

  shareOffer() {
    if (navigator.share) {
      const offer = this.jobOffer();
      if (offer) {
        navigator.share({
          title: offer.title,
          text: offer.description.substring(0, 150) + '...',
          url: window.location.href
        });
      }
    } else {
      this.copyOfferUrl();
    }
  }
  testPythonConnection() {
  console.log('🔧 [2025-07-10 19:52:24] Test connexion Python - User: neji123');
  
  this.recommendationService.testPythonConnection().subscribe({
    next: (response) => {
      console.log('✅ Réponse test Python:', response);
      console.log('📊 Détails:', {
        success: response.success,
        message: response.message,
        pythonApiUrl: response.pythonApiUrl,
        timestamp: new Date().toISOString(),
        user: 'neji123'
      });
    },
    error: (error) => {
      console.error('❌ Erreur test Python:', error);
      console.log('📊 Détails erreur:', {
        success: false,
        error: error.message || error,
        timestamp: new Date().toISOString(),
        user: 'neji123'
      });
    }
  });
}
}