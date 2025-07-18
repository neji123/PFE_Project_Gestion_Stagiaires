
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { RatingService, RatingDetailDto, EvaluationType, RatingStatus } from '../../../services/Rating/rating.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-rating-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rating-detail.component.html',
  styleUrls: ['./rating-detail.component.scss']
})
export class RatingDetailComponent implements OnInit, OnDestroy {
  private ratingService = inject(RatingService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // 🔧 Signals pour l'état réactif
  rating = signal<RatingDetailDto | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  showResponse = signal(false);
  responseText = signal('');

  // 🔧 Computed properties corrigées
  currentUser = computed(() => this.authService.currentUserValue);
  
  canEdit = computed(() => {
    const rating = this.rating();
    const user = this.currentUser();
    
    return rating != null && user != null && 
           rating.evaluatorId === user.id && 
           rating.status === RatingStatus.Draft;
  });

  canRespond = computed(() => {
    const rating = this.rating();
    const user = this.currentUser();
    
    return rating != null && user != null && 
           rating.evaluatedUserId === user.id && 
           rating.status === RatingStatus.Approved &&
           !rating.response;
  });

  canApprove = computed(() => {
    const rating = this.rating();
    const user = this.currentUser();
    
    return rating != null && user != null && 
           (user.role === 'RHs' || user.role === 'Admin') &&
           rating.status === RatingStatus.Submitted;
  });

  scorePercentage = computed(() => {
    const rating = this.rating();
    return rating ? (rating.score / 5) * 100 : 0;
  });

  scoreColorClass = computed(() => {
    const score = this.rating()?.score || 0;
    if (score >= 4.5) return 'score-excellent';
    if (score >= 3.5) return 'score-good';
    if (score >= 2.5) return 'score-average';
    return 'score-poor';
  });

  // 🔧 CORRECTION MAJEURE : Computed properties pour les critères
  detailedScoresArray = computed(() => {
    const rating = this.rating();
    console.log('🔍 Calcul detailedScoresArray:', rating);
    
    if (!rating) {
      console.log('❌ Pas de rating pour detailedScoresArray');
      return [];
    }
    
    console.log('📊 DetailedScores dans le rating:', rating.detailedScores);
    console.log('🎯 Type d\'évaluation:', rating.type);
    
    if (!rating.detailedScores) {
      console.log('❌ Pas de detailedScores');
      return [];
    }

    const labels: {[key: string]: { label: string, icon: string }} = {
      technicalSkills: { label: 'Compétences techniques', icon: '🔧' },
      communication: { label: 'Communication', icon: '💬' },
      teamwork: { label: 'Travail d\'équipe', icon: '👥' },
      initiative: { label: 'Initiative', icon: '🚀' },
      punctuality: { label: 'Ponctualité', icon: '⏰' },
      problemSolving: { label: 'Résolution de problèmes', icon: '🧩' },
      adaptability: { label: 'Adaptabilité', icon: '🔄' },
      overallPerformance: { label: 'Performance globale', icon: '🎯' }
    };

    const result = Object.entries(rating.detailedScores).map(([key, value]) => ({
      key,
      label: labels[key]?.label || key,
      icon: labels[key]?.icon || '📊',
      value: value as number,
      percentage: ((value as number) / 5) * 100
    }));
    
    console.log('✅ detailedScoresArray calculé:', result);
    return result;
  });

  tutorScoresArray = computed(() => {
    const rating = this.rating();
    console.log('🔍 Calcul tutorScoresArray:', rating);
    
    if (!rating) {
      console.log('❌ Pas de rating pour tutorScoresArray');
      return [];
    }
    
    console.log('👨‍🏫 TutorScores dans le rating:', rating.tutorScores);
    console.log('🎯 Type d\'évaluation:', rating.type);
    
    if (!rating.tutorScores) {
      console.log('❌ Pas de tutorScores');
      return [];
    }

    const labels: {[key: string]: { label: string, icon: string }} = {
      availability: { label: 'Disponibilité', icon: '📅' },
      guidance: { label: 'Accompagnement', icon: '🧭' },
      communication: { label: 'Communication', icon: '💬' },
      expertise: { label: 'Expertise technique', icon: '🎓' },
      support: { label: 'Soutien', icon: '🤝' },
      feedback: { label: 'Qualité du feedback', icon: '📝' },
      overallSatisfaction: { label: 'Satisfaction globale', icon: '😊' }
    };

    const result = Object.entries(rating.tutorScores).map(([key, value]) => ({
      key,
      label: labels[key]?.label || key,
      icon: labels[key]?.icon || '📊',
      value: value as number,
      percentage: ((value as number) / 5) * 100
    }));
    
    console.log('✅ tutorScoresArray calculé:', result);
    return result;
  });

  // 🔧 Effect pour le debugging
  constructor() {
    effect(() => {
      const rating = this.rating();
      console.log('🔄 Effect: Rating changé:', rating);
      if (rating) {
        console.log('📊 Detailed scores:', rating.detailedScores);
        console.log('👨‍🏫 Tutor scores:', rating.tutorScores);
        console.log('🎯 Type:', rating.type);
      }
    });
  }

  ngOnInit() {
    const ratingId = Number(this.route.snapshot.params['id']);
    console.log('🚀 Initialisation avec ratingId:', ratingId);
    
    if (ratingId && !isNaN(ratingId)) {
      this.loadRating(ratingId);
    } else {
      console.error('❌ ID d\'évaluation invalide:', ratingId);
      this.error.set('ID d\'évaluation invalide');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔧 Méthode de chargement améliorée
  private loadRating(ratingId: number) {
    console.log('📥 Chargement de l\'évaluation:', ratingId);
    this.isLoading.set(true);
    this.error.set(null);
    
    this.ratingService.getRatingById(ratingId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          console.log('🏁 Chargement terminé');
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (rating) => {
          console.log('✅ Évaluation chargée avec succès:', rating);
          console.log('📊 Détails des scores:', {
            detailedScores: rating.detailedScores,
            tutorScores: rating.tutorScores,
            type: rating.type
          });
          
          // 🔧 Mise à jour du signal - déclenche la réactivité
          this.rating.set(rating);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement:', error);
          this.error.set('Impossible de charger l\'évaluation');
        }
      });
  }

  // Actions
  editRating() {
    const ratingId = this.rating()?.id;
    if (ratingId) {
      this.router.navigate(['/ratings/edit', ratingId]);
    }
  }

  toggleResponseForm() {
    this.showResponse.set(!this.showResponse());
  }

  submitResponse() {
    const ratingId = this.rating()?.id;
    const response = this.responseText().trim();
    
    if (!ratingId || !response) return;

    const responseDto = {
      ratingId: ratingId,
      response: response
    };

    this.ratingService.addResponse(ratingId, responseDto).subscribe({
      next: (updatedRating: RatingDetailDto) => {
        this.rating.set(updatedRating);
        this.showResponse.set(false);
        this.responseText.set('');
        console.log('✅ Réponse ajoutée avec succès');
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'ajout de la réponse:', error);
      }
    });
  }

  approveRating() {
    const ratingId = this.rating()?.id;
    if (!ratingId) return;

    const approveDto = {
      ratingId: ratingId,
      isApproved: true
    };

    this.ratingService.approveRating(ratingId, approveDto).subscribe({
      next: (updatedRating: RatingDetailDto) => {
        this.rating.set(updatedRating);
        console.log('✅ Évaluation approuvée');
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'approbation:', error);
      }
    });
  }

  rejectRating() {
    const ratingId = this.rating()?.id;
    const reason = prompt('Raison du rejet:');
    
    if (!ratingId || !reason) return;

    this.ratingService.rejectRating(ratingId, reason).subscribe({
      next: (updatedRating: RatingDetailDto) => {
        this.rating.set(updatedRating);
        console.log('✅ Évaluation rejetée');
      },
      error: (error) => {
        console.error('❌ Erreur lors du rejet:', error);
      }
    });
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/ratings']);
    }
  }

  // Utilitaires
  getEvaluationTypeLabel(type: EvaluationType): string {
    return this.ratingService.getEvaluationTypeLabel(type);
  }

  getStatusBadge(status: RatingStatus) {
    return this.ratingService.getStatusBadge(status);
  }

  getScoreLabel(score: number): string {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Bien';
    if (score >= 2.5) return 'Moyen';
    if (score >= 1.5) return 'Faible';
    return 'Très faible';
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRelativeTime(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    
    return this.formatDate(date);
  }

  getAnimationDelay(index: number): string {
    return `${index * 0.1}s`;
  }

  onResponseInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.responseText.set(target.value);
  }
  getScoreClass(score: number): string {
  if (score >= 4.5) return 'score-excellent';
  if (score >= 3.5) return 'score-good';
  if (score >= 2.5) return 'score-average';
  return 'score-poor';
}



getImageUrl(relativeUrl: string | null): string {
  if (!relativeUrl) return '/assets/images/avatar-placeholder.png';
  
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  return `${environment.apiUrl}${relativeUrl}`;
}

/**
 * 🔧 Gestion des erreurs d'images avec fallback vers initiales
 */
handleImageError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  
  const parent = img.parentElement;
  if (parent) {
    const name = img.alt || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    parent.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
  }
}

/**
 * 👤 Obtenir les initiales d'un nom
 */
getInitials(firstName: string, lastName: string): string {
  return firstName && lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : '??';
}




}