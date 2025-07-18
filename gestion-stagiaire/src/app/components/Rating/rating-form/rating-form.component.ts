import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, takeUntil, filter, finalize, firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop'; // 🔧 AJOUT CRUCIAL pour connecter FormControl aux Signals
import { RatingService, CreateRatingDto, UpdateRatingDto, EvaluationType, DetailedEvaluationCriteria, TutorEvaluationCriteria, RatingDetailDto } from '../../../services/Rating/rating.service';
import { UserService } from '../../../services/User/user.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { environment } from '../../../environments/environment';
import { RatingStatus } from '../../../services/Rating/rating.service';
@Component({
  selector: 'app-rating-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rating-form.component.html',
  styleUrls: ['./rating-form.component.scss']
})


export class RatingFormComponent implements OnInit, OnDestroy {
  private formBuilder = inject(FormBuilder);
  private ratingService = inject(RatingService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // 🔧 AJOUT: Propriété environment pour le template
  environment = environment;

userSearchText: string = '';
userDepartmentFilter: string = '';
userRoleFilter: string = '';
filteredAvailableUsers = signal<any[]>([]);
availableRoles = [
  { value: 'Stagiaire', label: 'Stagiaire' },
  { value: 'Tuteur', label: 'Tuteur' },
  { value: 'RHs', label: 'RH' },
  { value: 'Admin', label: 'Admin' }
];
  // Signals pour l'état réactif
  isEditMode = signal(false);
  isLoading = signal(false);
  availableUsers = signal<any[]>([]);
  suggestedGeneralScore = signal<number>(3);
  hasUnsavedChanges = signal(false);
  
  // Computed properties
  currentUser = computed(() => this.authService.currentUserValue);
  
  // Form
  ratingForm!: FormGroup;

  // 🔧 SOLUTION: Bridge entre FormControl et Signals
  private typeFormValueSignal = signal<any>(null);

  // Critères d'évaluation
  detailedCriteria = [
    { 
      key: 'technicalSkills', 
      label: 'Compétences techniques',
      icon: '🔧',
      description: 'Maîtrise des outils et technologies'
    },
    { 
      key: 'communication', 
      label: 'Communication',
      icon: '💬',
      description: 'Capacité à communiquer efficacement'
    },
    { 
      key: 'teamwork', 
      label: 'Travail d\'équipe',
      icon: '👥',
      description: 'Collaboration et esprit d\'équipe'
    },
    { 
      key: 'initiative', 
      label: 'Initiative',
      icon: '🚀',
      description: 'Proactivité et prise d\'initiative'
    },
    { 
      key: 'punctuality', 
      label: 'Ponctualité',
      icon: '⏰',
      description: 'Respect des horaires et délais'
    },
    { 
      key: 'problemSolving', 
      label: 'Résolution de problèmes',
      icon: '🧩',
      description: 'Capacité à analyser et résoudre'
    },
    { 
      key: 'adaptability', 
      label: 'Adaptabilité',
      icon: '🔄',
      description: 'Flexibilité face aux changements'
    },
    { 
      key: 'overallPerformance', 
      label: 'Performance globale',
      icon: '🎯',
      description: 'Évaluation générale des résultats'
    }
  ];

  tutorCriteria = [
    { 
      key: 'availability', 
      label: 'Disponibilité',
      icon: '📅',
      description: 'Accessibilité et temps accordé'
    },
    { 
      key: 'guidance', 
      label: 'Accompagnement',
      icon: '🧭',
      description: 'Qualité de l\'encadrement'
    },
    { 
      key: 'communication', 
      label: 'Communication',
      icon: '💬',
      description: 'Clarté des explications'
    },
    { 
      key: 'expertise', 
      label: 'Expertise technique',
      icon: '🎓',
      description: 'Niveau de compétence technique'
    },
    { 
      key: 'support', 
      label: 'Soutien',
      icon: '🤝',
      description: 'Aide et encouragement'
    },
    { 
      key: 'feedback', 
      label: 'Qualité du feedback',
      icon: '📝',
      description: 'Pertinence des retours'
    },
    { 
      key: 'overallSatisfaction', 
      label: 'Satisfaction globale',
      icon: '😊',
      description: 'Satisfaction générale du tutorat'
    }
  ];

  // 🔧 COMPUTED PROPERTIES CORRIGÉES avec bridge FormControl-Signals
  availableTypes = computed(() => {
    const user = this.currentUser();
    console.log('🔍 availableTypes: Current user =', user);
    
    if (!user) return [];

    const types = [];
    
    if (user.role === 'Tuteur') {
      types.push({ value: EvaluationType.TuteurToStagiaire, label: 'Évaluer un stagiaire' });
    }
    
    if (user.role === 'Stagiaire') {
      types.push({ value: EvaluationType.StagiaireToTuteur, label: 'Évaluer mon tuteur' });
    }
    
    if (user.role === 'RHs' || user.role === 'Admin') {
      types.push({ value: EvaluationType.RHToStagiaire, label: 'Évaluer un stagiaire (RH)' });
    }

    console.log('🔍 availableTypes: Types disponibles =', types);
    return types;
  });

  showDetailedCriteria = computed(() => {
    // 🔧 SOLUTION: Utiliser le signal de bridge pour la réactivité
    const typeSignalValue = this.typeFormValueSignal();
    
    if (!this.ratingForm) {
      console.log('🔍 showDetailedCriteria: Pas de formulaire');
      return false;
    }
    
    const typeValue = this.ratingForm.get('type')?.value;
    console.log('🔍 showDetailedCriteria: Type value =', typeValue, 'Type signal =', typeSignalValue);
    
    const isValid = typeValue !== '' && typeValue !== undefined && typeValue !== null && !isNaN(Number(typeValue));
    console.log('🔍 showDetailedCriteria: Is valid =', isValid);
    
    return isValid;
  });

  isEvaluatingTutor = computed(() => {
    // 🔧 SOLUTION: Utiliser le signal de bridge pour la réactivité
    const typeSignalValue = this.typeFormValueSignal();
    
    if (!this.ratingForm) {
      console.log('🔍 isEvaluatingTutor: Pas de formulaire');
      return false;
    }
    
    const typeValue = this.ratingForm.get('type')?.value;
    const result = Number(typeValue) === EvaluationType.StagiaireToTuteur;
    console.log('🔍 isEvaluatingTutor: typeValue =', typeValue, 'result =', result);
    
    return result;
  });

  // 🔧 EFFECT pour forcer la mise à jour des computed properties
  constructor() {
    effect(() => {
      // Cet effect force Angular à vérifier les computed properties
      // quand les valeurs du formulaire changent
      if (this.ratingForm) {
        const typeValue = this.ratingForm.get('type')?.value;
        console.log('🔄 Effect: Type value changed to', typeValue);
      }
    });
  }

  ngOnInit() {
    console.log('🚀 Initialisation RatingFormComponent');
    
    this.initializeForm();
    
    // Vérification que le formulaire est bien initialisé
    if (!this.ratingForm) {
      console.error('❌ Erreur : Formulaire non initialisé');
      return;
    }
    
    this.checkEditMode();
    this.loadAvailableUsers();
    this.setupAutoSave();
    this.setupFormValidation();
    
    // 🔧 SOLUTION: Setup du bridge FormControl-Signals
    this.setupFormToSignalsBridge();
    
    console.log('🔧 RatingFormComponent initialisé');
    console.log('Form valid:', this.ratingForm?.valid);
    console.log('Current user:', this.currentUser());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🔧 SOLUTION: Pont entre le formulaire et les signals
  private setupFormToSignalsBridge() {
    if (!this.ratingForm) return;

    // Écouter les changements du type d'évaluation
    this.ratingForm.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(typeValue => {
        console.log('🔄 Type FormControl changed:', typeValue);
        
        // Mettre à jour le signal de bridge
        this.typeFormValueSignal.set(typeValue);
        
        // Déclencher la mise à jour des computed properties
        setTimeout(() => {
          console.log('🔄 Après changement de type:');
          console.log('- showDetailedCriteria():', this.showDetailedCriteria());
          console.log('- isEvaluatingTutor():', this.isEvaluatingTutor());
        }, 0);
      });
  }

  // 📝 INITIALISATION DU FORMULAIRE
  private initializeForm() {
    this.ratingForm = this.formBuilder.group({
      evaluatedUserId: ['', [Validators.required]],
      score: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      type: ['', [Validators.required]],
      evaluationPeriodStart: [''],
      evaluationPeriodEnd: [''],
      stageReference: ['', [Validators.maxLength(100)]],
      
      detailedScores: this.formBuilder.group({
        technicalSkills: [3, [Validators.min(1), Validators.max(5)]],
        communication: [3, [Validators.min(1), Validators.max(5)]],
        teamwork: [3, [Validators.min(1), Validators.max(5)]],
        initiative: [3, [Validators.min(1), Validators.max(5)]],
        punctuality: [3, [Validators.min(1), Validators.max(5)]],
        problemSolving: [3, [Validators.min(1), Validators.max(5)]],
        adaptability: [3, [Validators.min(1), Validators.max(5)]],
        overallPerformance: [3, [Validators.min(1), Validators.max(5)]]
      }),
      
      tutorScores: this.formBuilder.group({
        availability: [3, [Validators.min(1), Validators.max(5)]],
        guidance: [3, [Validators.min(1), Validators.max(5)]],
        communication: [3, [Validators.min(1), Validators.max(5)]],
        expertise: [3, [Validators.min(1), Validators.max(5)]],
        support: [3, [Validators.min(1), Validators.max(5)]],
        feedback: [3, [Validators.min(1), Validators.max(5)]],
        overallSatisfaction: [3, [Validators.min(1), Validators.max(5)]]
      })
    });

    // Ajouter des validateurs personnalisés
    this.addCustomValidators();
  }

  // 🛡️ VALIDATEURS PERSONNALISÉS
  private addCustomValidators() {
    // Valider que la date de fin est après la date de début
    this.ratingForm.addValidators(this.dateRangeValidator.bind(this));
    
    // Valider la cohérence des scores
    this.ratingForm.get('score')?.addValidators(this.scoreConsistencyValidator.bind(this));
  }

  private dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('evaluationPeriodStart')?.value;
    const end = group.get('evaluationPeriodEnd')?.value;
    
    if (start && end && new Date(start) >= new Date(end)) {
      return { dateRange: 'La date de fin doit être postérieure à la date de début' };
    }
    return null;
  }

  private scoreConsistencyValidator(control: AbstractControl): ValidationErrors | null {
    if (!this.ratingForm || !control.value) return null;
    
    const generalScore = control.value;
    const isEvaluatingTutor = this.isEvaluatingTutor();
    const scoresGroup = isEvaluatingTutor ? 
      this.ratingForm.get('tutorScores') : 
      this.ratingForm.get('detailedScores');
    
    if (scoresGroup && scoresGroup.value && generalScore) {
      const detailedScores = scoresGroup.value;
      const scores = Object.values(detailedScores) as number[];
      const avgDetailedScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      const difference = Math.abs(generalScore - avgDetailedScore);
      
      if (difference > 1.5) {
        return { 
          scoreInconsistency: `Le score général (${generalScore}) est très différent de la moyenne des critères détaillés (${avgDetailedScore.toFixed(1)})` 
        };
      }
    }
    return null;
  }

  // 🔄 SETUP AUTO-SAVE ET VALIDATION
  private setupAutoSave() {
    // Auto-sauvegarde toutes les 30 secondes
    this.ratingForm.valueChanges
      .pipe(
        debounceTime(30000),
        takeUntil(this.destroy$),
        filter(() => this.ratingForm.valid && this.ratingForm.dirty && !this.isLoading())
      )
      .subscribe(() => {
        console.log('💾 Auto-sauvegarde du brouillon...');
        this.autoSaveDraft();
      });

    // Détecter les changements non sauvegardés
    this.ratingForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.hasUnsavedChanges.set(this.ratingForm.dirty);
      });
  }

  private setupFormValidation() {
    // Mise à jour du score suggéré quand les critères changent
    const detailedScoresGroup = this.ratingForm.get('detailedScores');
    const tutorScoresGroup = this.ratingForm.get('tutorScores');

    if (detailedScoresGroup) {
      detailedScoresGroup.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.updateSuggestedScore());
    }

    if (tutorScoresGroup) {
      tutorScoresGroup.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.updateSuggestedScore());
    }
  }

  // 🔍 CHARGEMENT DES DONNÉES
  private checkEditMode() {
    const ratingId = this.route.snapshot.params['id'];
    if (ratingId && !isNaN(Number(ratingId))) {
      this.isEditMode.set(true);
      this.loadRatingForEdit(Number(ratingId));
    }
  }

private loadAvailableUsers() {
  console.log('👥 Chargement des utilisateurs évaluables (endpoint optimisé)...');
  
  // 🎯 UTILISATION DE L'ENDPOINT OPTIMISÉ
  this.ratingService.getUsersICanRateNotEvaluated()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (users) => {
        console.log('✅ Utilisateurs non évalués chargés (endpoint optimisé):', users);
        console.log('📊 Détail:', users.map(u => ({ 
          id: u.id, 
          name: `${u.firstName} ${u.lastName}`, 
          role: u.role,
          department: u.department || u.departement || 'Non défini'
        })));
        
        this.availableUsers.set(users || []);
        
        // 🔧 NOUVEAU: Validation intelligente des filtres existants
        const filtersChanged = this.validateAndCleanFilters();
        
        if (!filtersChanged) {
          // Si aucun filtre n'a changé, initialiser les utilisateurs filtrés
          this.filteredAvailableUsers.set([...users]);
          
          // Appliquer les filtres existants s'il y en a
          if (this.userSearchText || this.userDepartmentFilter || this.userRoleFilter) {
            console.log('🔄 Application des filtres existants...');
            this.filterAvailableUsers();
          }
        }
        // Sinon, validateAndCleanFilters() a déjà appelé filterAvailableUsers()
        
        // 🔍 Log pour debug avec informations dynamiques
        if (users.length === 0) {
          console.log('ℹ️ Aucun utilisateur à évaluer (tous déjà évalués ou aucun assigné)');
        } else {
          console.log(`🎯 ${users.length} utilisateur(s) disponible(s) pour évaluation`);
          
          const departments = this.getAvailableDepartments();
          const roles = this.getAvailableUserRoles();
          
          console.log('🏢 Départements dynamiques détectés:', departments.length > 0 ? departments : 'Aucun');
          console.log('🎭 Rôles dynamiques détectés:', roles.length > 0 ? roles : 'Aucun');
          
          // Afficher les statistiques détaillées
          this.getFilterStatistics();
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des utilisateurs non évalués:', error);
        this.showErrorMessage('Impossible de charger la liste des utilisateurs à évaluer');
        
        // 🔧 NOUVEAU: Vider aussi les utilisateurs filtrés en cas d'erreur
        this.filteredAvailableUsers.set([]);
        
        // 🔧 Reset des filtres car plus de données
        this.resetUserFilters();
        
        // 🔧 FALLBACK: En cas d'erreur, essayer l'ancienne méthode
        console.log('🔄 Tentative avec l\'ancienne méthode...');
        this.loadAvailableUsersOldMethod();
      }
    });
}

/**
 * 🔧 MÉTHODE FALLBACK: Ancienne logique en cas de problème
 */
private loadAvailableUsersOldMethod() {
  this.ratingService.getUsersICanRate()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (users) => {
        console.log('⚠️ Utilisation de l\'ancienne méthode - tous les utilisateurs:', users);
        this.availableUsers.set(users || []);
        
        // Fallback avec des données de test en développement
        if (!environment.production && (!users || users.length === 0)) {
          this.availableUsers.set([
            { id: 1, firstName: 'Test', lastName: 'User', role: 'Stagiaire' },
            { id: 2, firstName: 'Another', lastName: 'User', role: 'Tuteur' }
          ]);
        }
      },
      error: (error) => {
        console.error('❌ Erreur avec l\'ancienne méthode aussi:', error);
        this.showErrorMessage('Impossible de charger la liste des utilisateurs');
      }
    });
}



  private patchFormWithRating(rating: any) {
    this.ratingForm.patchValue({
      evaluatedUserId: rating.evaluatedUserId,
      score: rating.score,
      comment: rating.comment,
      type: rating.type,
      evaluationPeriodStart: rating.evaluationPeriodStart ? 
        new Date(rating.evaluationPeriodStart).toISOString().split('T')[0] : '',
      evaluationPeriodEnd: rating.evaluationPeriodEnd ? 
        new Date(rating.evaluationPeriodEnd).toISOString().split('T')[0] : '',
      stageReference: rating.stageReference || ''
    });

    if (rating.detailedScores) {
      this.ratingForm.get('detailedScores')?.patchValue(rating.detailedScores);
    }

    if (rating.tutorScores) {
      this.ratingForm.get('tutorScores')?.patchValue(rating.tutorScores);
    }

    // Marquer le formulaire comme pristine après le chargement
    this.ratingForm.markAsPristine();
    this.hasUnsavedChanges.set(false);
  }

  // 🎯 MÉTHODES D'INTERACTION
  onEvaluationTypeChange() {
    const type = this.ratingForm.get('type')?.value;
    console.log('🔄 Type d\'évaluation changé:', type, typeof type);
    
    // 🔧 Mettre à jour le signal de bridge
    this.typeFormValueSignal.set(type);
    
    this.resetScores();
    this.updateSuggestedScore();
    
    // 🔧 Forcer la mise à jour immédiate des computed properties
    setTimeout(() => {
      console.log('🔄 Après onEvaluationTypeChange:');
      console.log('- showDetailedCriteria():', this.showDetailedCriteria());
      console.log('- isEvaluatingTutor():', this.isEvaluatingTutor());
    }, 0);
  }

  private resetScores() {
    const defaultScore = 3;
    
    // Réinitialiser les scores détaillés
    const detailedScoresGroup = this.ratingForm.get('detailedScores') as FormGroup;
    if (detailedScoresGroup && detailedScoresGroup.controls) {
      Object.keys(detailedScoresGroup.controls).forEach(key => {
        detailedScoresGroup.get(key)?.setValue(defaultScore);
      });
    }

    // Réinitialiser les scores tuteur
    const tutorScoresGroup = this.ratingForm.get('tutorScores') as FormGroup;
    if (tutorScoresGroup && tutorScoresGroup.controls) {
      Object.keys(tutorScoresGroup.controls).forEach(key => {
        tutorScoresGroup.get(key)?.setValue(defaultScore);
      });
    }

    // Réinitialiser le score général
    this.ratingForm.get('score')?.setValue(defaultScore);
  }

  private updateSuggestedScore() {
  if (!this.ratingForm) return;
  
  const isEvaluatingTutor = this.isEvaluatingTutor();
  const scoresGroup = isEvaluatingTutor ? 
    this.ratingForm.get('tutorScores') as FormGroup : 
    this.ratingForm.get('detailedScores') as FormGroup;
  
  if (scoresGroup && scoresGroup.value) {
    const scores = Object.values(scoresGroup.value) as number[];
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    this.suggestedGeneralScore.set(Math.round(averageScore * 10) / 10);
  }
}

  getScoreLabel(score: number): string {
    if (score <= 1.5) return 'Très faible';
    if (score <= 2.5) return 'Faible';
    if (score <= 3.5) return 'Moyen';
    if (score <= 4.5) return 'Bien';
    return 'Excellent';
  }

  // 💾 SAUVEGARDE
 async saveDraft() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading.set(true);
    
    try {
      if (this.isEditMode()) {
        const updateData = this.prepareUpdateData();
        const ratingId = this.route.snapshot.params['id'];
        
        await firstValueFrom(this.ratingService.updateRating(Number(ratingId), updateData));
        this.showSuccessMessage('Modifications sauvegardées avec succès');
      } else {
        const createData = this.prepareCreateData();
        
        const result = await firstValueFrom(this.ratingService.createRating(createData));
        this.showSuccessMessage('Brouillon créé avec succès');
        
        // Passer en mode édition après création
        this.isEditMode.set(true);
        this.router.navigate(['/ratings/edit', result.id], { replaceUrl: true });
      }
      
      this.ratingForm.markAsPristine();
      this.hasUnsavedChanges.set(false);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      this.showErrorMessage(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async autoSaveDraft() {
    if (!this.validateForm() || this.isLoading()) {
      return;
    }

    try {
      if (this.isEditMode()) {
        const updateData = this.prepareUpdateData();
        const ratingId = this.route.snapshot.params['id'];
        
        await firstValueFrom(this.ratingService.updateRating(Number(ratingId), updateData));
        console.log('💾 Auto-sauvegarde réussie');
      } else {
        const createData = this.prepareCreateData();
        
        const result = await firstValueFrom(this.ratingService.createRating(createData));
        console.log('💾 Auto-création réussie, ID:', result.id);
        
        // Passer en mode édition après la première création
        this.isEditMode.set(true);
        this.router.navigate(['/ratings/edit', result.id], { replaceUrl: true });
      }
      
      this.ratingForm.markAsPristine();
      this.hasUnsavedChanges.set(false);
    } catch (error: any) {
      console.error('❌ Erreur auto-sauvegarde:', error);
    }
  }
private originalRating: RatingDetailDto | null = null;
  isSubmitting = signal(false);
  
  // 🔧 NOUVELLE PROPRIÉTÉ COMPUTED pour l'interface utilisateur
  submitButtonText = computed(() => {
    if (this.isSubmitting()) return 'Soumission...';
    if (this.isEditMode()) {
      return this.originalRating?.status === RatingStatus.Draft ? 
        'Mettre à jour et soumettre' : 
        'Mettre à jour';
    }
    return 'Créer et soumettre';
  });

  saveButtonText = computed(() => {
    if (this.isLoading()) return 'Sauvegarde...';
    return this.isEditMode() ? 'Sauvegarder les modifications' : 'Sauvegarder comme brouillon';
  });

  // 🔧 MODIFIER cette méthode existante
  private loadRatingForEdit(ratingId: number) {
    this.isLoading.set(true);
    
    this.ratingService.getRatingById(ratingId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (rating) => {
          this.originalRating = rating; // 🔧 STOCKER l'original
          this.patchFormWithRating(rating);
          console.log('✅ Évaluation chargée pour édition:', rating.id, 'Status:', rating.status);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement de l\'évaluation:', error);
          this.showErrorMessage('Impossible de charger l\'évaluation');
          this.router.navigate(['/ratings']);
        }
      });
  }
  // 📤 SOUMISSION
 async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting.set(true);
    
    try {
      let rating: RatingDetailDto;
      
      if (this.isEditMode()) {
        // Mode édition
        console.log('📝 Mode édition - Mise à jour de l\'évaluation');
        const updateData = this.prepareUpdateData();
        const ratingId = this.route.snapshot.params['id'];
        
        // Mettre à jour l'évaluation
        rating = await firstValueFrom(this.ratingService.updateRating(Number(ratingId), updateData));
        console.log('✅ Évaluation mise à jour avec succès');

        // 🔧 LOGIQUE INTELLIGENTE : Soumettre seulement si c'était un brouillon
        if (this.originalRating?.status === RatingStatus.Draft) {
          console.log('📤 Évaluation était un brouillon, soumission pour approbation...');
          
          try {
            rating = await firstValueFrom(this.ratingService.submitRating(rating.id));
            console.log('✅ Évaluation soumise avec succès');
            this.showSuccessMessage('Évaluation mise à jour et soumise avec succès !');
          } catch (submitError: any) {
            // Si la soumission échoue, l'évaluation est quand même mise à jour
            console.warn('⚠️ Mise à jour réussie mais soumission échouée:', submitError);
            this.showSuccessMessage('Évaluation mise à jour avec succès. Vous pouvez la soumettre manuellement si nécessaire.');
          }
        } else {
          // Évaluation déjà soumise, juste mise à jour
          console.log('ℹ️ Évaluation déjà soumise, pas de re-soumission');
          this.showSuccessMessage('Évaluation mise à jour avec succès !');
        }
        
      } else {
        // Mode création
        console.log('🆕 Mode création - Nouvelle évaluation');
        const createData = this.prepareCreateData();
        
        // Créer l'évaluation
        rating = await firstValueFrom(this.ratingService.createRating(createData));
        console.log('✅ Évaluation créée avec succès');

        // Soumettre la nouvelle évaluation
        try {
          rating = await firstValueFrom(this.ratingService.submitRating(rating.id));
          console.log('✅ Nouvelle évaluation soumise avec succès');
          this.showSuccessMessage('Évaluation créée et soumise avec succès !');
        } catch (submitError: any) {
          console.warn('⚠️ Création réussie mais soumission échouée:', submitError);
          this.showSuccessMessage('Évaluation créée et sauvegardée. Vous pouvez la soumettre manuellement.');
        }
      }

      // Marquer comme propre et naviguer
      this.ratingForm.markAsPristine();
      this.hasUnsavedChanges.set(false);
      
      // Navigation intelligente selon le contexte
      setTimeout(() => {
        this.router.navigate(['/ratings']);
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la soumission:', error);
      this.showErrorMessage(`Erreur: ${error.message || 'Une erreur est survenue lors de la soumission'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // 🔧 NOUVELLE MÉTHODE pour soumettre manuellement (si besoin)
  async submitOnly() {
    if (!this.originalRating || this.originalRating.status !== RatingStatus.Draft) {
      this.showErrorMessage('Cette évaluation ne peut pas être soumise');
      return;
    }

    this.isSubmitting.set(true);
    
    try {
      const ratingId = this.route.snapshot.params['id'];
      await firstValueFrom(this.ratingService.submitRating(Number(ratingId)));
      
      this.showSuccessMessage('Évaluation soumise avec succès !');
      this.router.navigate(['/ratings']);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la soumission:', error);
      this.showErrorMessage(`Erreur: ${error.message || 'Impossible de soumettre l\'évaluation'}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // 🛡️ VALIDATION
  private validateForm(): boolean {
    if (!this.ratingForm) {
      console.error('Formulaire non initialisé');
      return false;
    }
    
    if (!this.ratingForm.valid) {
      this.markFormGroupTouched(this.ratingForm);
      this.showValidationErrors();
      return false;
    }
    return true;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    if (!formGroup || !formGroup.controls) {
      return;
    }
    
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  private showValidationErrors() {
    const errors: string[] = [];
    
    if (this.ratingForm?.get('evaluatedUserId')?.errors) {
      errors.push('Veuillez sélectionner un utilisateur à évaluer');
    }
    
    if (this.ratingForm?.get('type')?.errors) {
      errors.push('Veuillez sélectionner le type d\'évaluation');
    }
    
    if (this.ratingForm?.get('comment')?.errors) {
      const commentErrors = this.ratingForm.get('comment')?.errors;
      if (commentErrors?.['required']) {
        errors.push('Le commentaire est obligatoire');
      }
      if (commentErrors?.['minlength']) {
        errors.push('Le commentaire doit contenir au moins 10 caractères');
      }
      if (commentErrors?.['maxlength']) {
        errors.push('Le commentaire ne peut pas dépasser 1000 caractères');
      }
    }
    
    if (this.ratingForm?.errors?.['dateRange']) {
      errors.push(this.ratingForm.errors['dateRange']);
    }
    
    if (this.ratingForm?.get('score')?.errors?.['scoreInconsistency']) {
      errors.push(this.ratingForm.get('score')?.errors!['scoreInconsistency']);
    }
    
    if (errors.length > 0) {
      this.showErrorMessage(errors.join('\n'));
    }
  }

  // 📋 PRÉPARATION DES DONNÉES
  private prepareCreateData(): CreateRatingDto {
    if (!this.ratingForm) {
      throw new Error('Formulaire non initialisé');
    }
    
    const formValue = this.ratingForm.value;
    
    const baseData = {
      evaluatedUserId: Number(formValue.evaluatedUserId),
      score: Number(formValue.score),
      comment: formValue.comment?.trim() || '',
      type: Number(formValue.type),
      evaluationPeriodStart: formValue.evaluationPeriodStart ? new Date(formValue.evaluationPeriodStart) : undefined,
      evaluationPeriodEnd: formValue.evaluationPeriodEnd ? new Date(formValue.evaluationPeriodEnd) : undefined,
      stageReference: formValue.stageReference?.trim() || undefined
    };

    if (this.isEvaluatingTutor()) {
      return {
        ...baseData,
        tutorScores: formValue.tutorScores
      } as CreateRatingDto;
    } else {
      return {
        ...baseData,
        detailedScores: formValue.detailedScores
      } as CreateRatingDto;
    }
  }

  private prepareUpdateData(): UpdateRatingDto {
    if (!this.ratingForm) {
      throw new Error('Formulaire non initialisé');
    }
    
    const formValue = this.ratingForm.value;
    
    const baseData = {
      score: Number(formValue.score),
      comment: formValue.comment?.trim() || '',
      evaluationPeriodStart: formValue.evaluationPeriodStart ? new Date(formValue.evaluationPeriodStart) : undefined,
      evaluationPeriodEnd: formValue.evaluationPeriodEnd ? new Date(formValue.evaluationPeriodEnd) : undefined,
      stageReference: formValue.stageReference?.trim() || undefined
    };

    if (this.isEvaluatingTutor()) {
      return {
        ...baseData,
        tutorScores: formValue.tutorScores
      } as UpdateRatingDto;
    } else {
      return {
        ...baseData,
        detailedScores: formValue.detailedScores
      } as UpdateRatingDto;
    }
  }

  // 🧭 NAVIGATION
  goBack() {
    if (this.hasUnsavedChanges()) {
      const confirmLeave = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
      if (!confirmLeave) {
        return;
      }
    }

    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/ratings']);
    }
  }

  // 💬 NOTIFICATIONS
  private showSuccessMessage(message: string) {
    console.log('✅ Succès:', message);
    // Intégration avec votre service de notification
    // this.notificationService.success(message);
  }

  private showErrorMessage(message: string) {
    console.error('❌ Erreur:', message);
    // Intégration avec votre service de notification
    // this.notificationService.error(message);
  }

  // 🔧 MÉTHODES MANQUANTES AJOUTÉES

  // 🎨 Méthode getAnimationDelay (utilisée dans le template)
  getAnimationDelay(index: number): string {
    return `${index * 0.1}s`;
  }

  // 🔧 Méthodes TrackBy pour les *ngFor (performance)
  trackByValue(index: number, item: any): any {
    return item?.value || index;
  }

  trackByUserId(index: number, user: any): any {
    return user?.id || index;
  }

  trackByCriterionKey(index: number, criterion: any): any {
    return criterion?.key || index;
  }

  // 🧪 MÉTHODES DE DEBUG AMÉLIORÉES
  testFormFunctionality() {
    console.group('🧪 Test du formulaire d\'évaluation - DIAGNOSTIC COMPLET');
    
    console.log('📋 Statut du formulaire:');
    console.log('- Valide:', this.ratingForm?.valid);
    console.log('- Modifié:', this.ratingForm?.dirty);
    console.log('- Touché:', this.ratingForm?.touched);
    console.log('- Changements non sauvegardés:', this.hasUnsavedChanges());
    
    console.log('📊 Valeurs critiques:');
    const typeValue = this.ratingForm?.get('type')?.value;
    console.log('- Type value:', typeValue, typeof typeValue);
    console.log('- Type signal:', this.typeFormValueSignal());
    console.log('- showDetailedCriteria():', this.showDetailedCriteria());
    console.log('- isEvaluatingTutor():', this.isEvaluatingTutor());
    
    console.log('👥 Données utilisateurs:');
    console.log('- Utilisateur connecté:', this.currentUser());
    console.log('- Types disponibles:', this.availableTypes());
    console.log('- Utilisateurs évaluables:', this.availableUsers());
    
    console.log('🎯 Enum EvaluationType:');
    console.log('- TuteurToStagiaire:', EvaluationType.TuteurToStagiaire);
    console.log('- RHToStagiaire:', EvaluationType.RHToStagiaire);
    console.log('- StagiaireToTuteur:', EvaluationType.StagiaireToTuteur);
    
    console.log('🔧 Form Controls:');
    console.log('- type control:', this.ratingForm?.get('type'));
    console.log('- type errors:', this.ratingForm?.get('type')?.errors);
    
    console.groupEnd();
    
    // 🔧 Test automatique des types
    console.log('🧪 Test automatique changement vers TuteurToStagiaire...');
    this.ratingForm?.get('type')?.setValue(EvaluationType.TuteurToStagiaire);
    this.onEvaluationTypeChange();
    
    setTimeout(() => {
      console.log('🧪 Après test TuteurToStagiaire:');
      console.log('- showDetailedCriteria():', this.showDetailedCriteria());
      console.log('- isEvaluatingTutor():', this.isEvaluatingTutor());
    }, 100);
  }

  private logFormErrors(form: FormGroup, prefix: string = '') {
    if (!form || !form.controls) {
      return;
    }
    
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (control instanceof FormGroup) {
        this.logFormErrors(control, fullKey);
      } else if (control?.errors) {
        console.log(`  - ${fullKey}:`, control.errors);
      }
    });
  }

  // 🔒 GUARD CONTRE LA FERMETURE SANS SAUVEGARDE
  canDeactivate(): boolean {
    if (this.hasUnsavedChanges()) {
      return confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?');
    }
    return true;
  }

  // 📊 Méthodes pour récupérer les valeurs des critères
 getTutorCriterionValue(criterionKey: string): number {
  const tutorScoresGroup = this.ratingForm?.get('tutorScores') as FormGroup;
  return tutorScoresGroup?.get(criterionKey)?.value || 3;
}

  getDetailedCriterionValue(criterionKey: string): number {
  const detailedScoresGroup = this.ratingForm?.get('detailedScores') as FormGroup;
  return detailedScoresGroup?.get(criterionKey)?.value || 3;
}

  // 📝 Descriptions des critères
  getTutorCriterionDescription(key: string): string {
    const criterion = this.tutorCriteria.find(c => c.key === key);
    return criterion?.description || '';
  }

  getDetailedCriterionDescription(key: string): string {
    const criterion = this.detailedCriteria.find(c => c.key === key);
    return criterion?.description || '';
  }

  // 🎨 Couleurs des scores
  getScoreColor(score: number): string {
    if (score <= 2) return 'score-low';
    if (score <= 3.5) return 'score-medium';
    return 'score-high';
  }

  // ✨ Accepter le score suggéré
  acceptSuggestedScore() {
    this.ratingForm?.get('score')?.setValue(this.suggestedGeneralScore());
    console.log('✅ Score suggéré accepté:', this.suggestedGeneralScore());
  }

  isSuggestedScoreActive(): boolean {
    const currentScore = this.ratingForm?.get('score')?.value || 0;
    const suggestedScore = this.suggestedGeneralScore();
    return Math.abs(currentScore - suggestedScore) < 0.1;
  }
  /**
 * 🔄 Actualiser la liste des utilisateurs disponibles
 */
refreshAvailableUsers() {
  console.log('🔄 Actualisation manuelle de la liste des utilisateurs...');
  this.isLoading.set(true);
  
  // Vider la liste actuelle
  this.availableUsers.set([]);
  
  // Recharger les utilisateurs
  this.loadAvailableUsers();
}

/**
 * 🎯 Vérifier si un utilisateur peut être évalué
 */
canEvaluateUser(userId: number): boolean {
  return this.availableUsers().some(user => user.id === userId);
}

/**
 * 📊 Obtenir le nombre d'utilisateurs disponibles par rôle
 */
getAvailableUsersCountByRole(): { [role: string]: number } {
  const users = this.availableUsers();
  const countByRole: { [role: string]: number } = {};
  
  users.forEach(user => {
    const role = user.role || 'Non défini';
    countByRole[role] = (countByRole[role] || 0) + 1;
  });
  
  return countByRole;
}

/**
 * 🔍 Rechercher un utilisateur dans la liste disponible
 */
findAvailableUserById(userId: number): any | null {
  return this.availableUsers().find(user => user.id === userId) || null;
}

/**
 * 🎨 Obtenir le message personnalisé selon le contexte
 */
getNoUsersMessage(): string {
  const user = this.currentUser();
  const selectedType = this.ratingForm?.get('type')?.value;
  
  if (!user) return 'Aucun utilisateur disponible.';
  
  if (selectedType === EvaluationType.TuteurToStagiaire) {
    return 'Vous avez déjà évalué tous vos stagiaires assignés, ou aucun stagiaire ne vous est actuellement assigné.';
  } else if (selectedType === EvaluationType.StagiaireToTuteur) {
    return 'Vous avez déjà évalué votre tuteur, ou aucun tuteur ne vous est assigné.';
  } else if (selectedType === EvaluationType.RHToStagiaire) {
    return 'Vous avez déjà évalué tous les stagiaires, ou aucun stagiaire n\'est disponible.';
  }
  
  return 'Vous avez déjà évalué tous les utilisateurs que vous pouvez évaluer.';
}

/**
 * 🎯 Vérifier si l'utilisateur a des évaluations en attente
 */
hasAvailableUsersForCurrentType(): boolean {
  const selectedType = this.ratingForm?.get('type')?.value;
  if (!selectedType && selectedType !== 0) return false;
  
  return this.availableUsers().length > 0;
}

/**
 * 🔧 Handler pour le changement de type d'évaluation - VERSION AMÉLIORÉE
 */
onEvaluationTypeChangeImproved() {
  const type = this.ratingForm.get('type')?.value;
  console.log('🔄 Type d\'évaluation changé:', type, typeof type);
  
  // Mettre à jour le signal de bridge
  this.typeFormValueSignal.set(type);
  
  // Réinitialiser l'utilisateur sélectionné car la liste va changer
  this.ratingForm.get('evaluatedUserId')?.setValue('');
  
  // Recharger la liste des utilisateurs pour ce type d'évaluation
  if (type !== '' && type !== undefined && type !== null) {
    this.refreshAvailableUsers();
  }
  
  this.resetScores();
  this.updateSuggestedScore();
  
  // Forcer la mise à jour des computed properties
  setTimeout(() => {
    console.log('🔄 Après onEvaluationTypeChange:');
    console.log('- showDetailedCriteria():', this.showDetailedCriteria());
    console.log('- isEvaluatingTutor():', this.isEvaluatingTutor());
    console.log('- Utilisateurs disponibles:', this.availableUsers().length);
  }, 0);
}






/**
 * 🔍 FILTRAGE PRINCIPAL: Filtre les utilisateurs selon les critères de recherche
 */
filterAvailableUsers() {
  console.log('🔍 === DÉBUT FILTRAGE UTILISATEURS ÉVALUABLES ===');
  console.log('📝 Texte de recherche:', `"${this.userSearchText}"`);
  console.log('🏢 Département:', `"${this.userDepartmentFilter}"`);
  console.log('🎭 Rôle:', `"${this.userRoleFilter}"`);
  console.log('👥 Utilisateurs de base:', this.availableUsers().length);
  
  let filtered = [...this.availableUsers()];
  console.log('🔄 Utilisateurs après copie:', filtered.length);
  
  // 🔍 Filtre par texte de recherche (nom, prénom, username, email)
  if (this.userSearchText.trim()) {
    const searchLower = this.userSearchText.toLowerCase().trim();
    console.log('🔍 Recherche active avec:', `"${searchLower}"`);
    
    const beforeSearchFilter = filtered.length;
    filtered = filtered.filter(user => {
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      
      const matches = firstName.includes(searchLower) ||
                     lastName.includes(searchLower) ||
                     fullName.includes(searchLower) ||
                     username.includes(searchLower) ||
                     email.includes(searchLower);
      
      console.log(`   👤 ${user.firstName} ${user.lastName}: firstName="${firstName}", lastName="${lastName}", fullName="${fullName}", matches=${matches}`);
      
      return matches;
    });
    console.log(`🔍 Après filtre texte: ${beforeSearchFilter} → ${filtered.length}`);
  }
  
  // 🏢 Filtre par département
  if (this.userDepartmentFilter) {
    console.log('🏢 Filtre département actif avec:', `"${this.userDepartmentFilter}"`);
    
    const beforeDeptFilter = filtered.length;
    filtered = filtered.filter(user => {
      const userDepartment = user.department || user.departement || '';
      const matches = userDepartment.toLowerCase() === this.userDepartmentFilter.toLowerCase();
      
      console.log(`   👤 ${user.firstName} ${user.lastName}: département="${userDepartment}", filtre="${this.userDepartmentFilter}", matches=${matches}`);
      
      return matches;
    });
    console.log(`🏢 Après filtre département: ${beforeDeptFilter} → ${filtered.length}`);
  }
  
  // 🎭 Filtre par rôle
  if (this.userRoleFilter) {
    console.log('🎭 Filtre de rôle actif avec:', `"${this.userRoleFilter}"`);
    
    const beforeRoleFilter = filtered.length;
    filtered = filtered.filter(user => {
      const userRole = user.role || '';
      const matches = userRole.toLowerCase() === this.userRoleFilter.toLowerCase();
      
      console.log(`   👤 ${user.firstName} ${user.lastName}: rôle="${userRole}", filtre="${this.userRoleFilter}", matches=${matches}`);
      
      return matches;
    });
    console.log(`🎭 Après filtre rôle: ${beforeRoleFilter} → ${filtered.length}`);
  }
  
  this.filteredAvailableUsers.set(filtered);
  console.log(`✅ RÉSULTAT FINAL: ${filtered.length} utilisateur(s) filtrés sur ${this.availableUsers().length} total`);
  console.log('🔍 === FIN FILTRAGE UTILISATEURS ÉVALUABLES ===');
}

/**
 * 🔍 ÉVÉNEMENT: Appelé quand le texte de recherche change
 */
onUserSearchChange() {
  console.log('🔍 onUserSearchChange appelé, nouveau texte:', `"${this.userSearchText}"`);
  this.filterAvailableUsers();
}

/**
 * 🏢 ÉVÉNEMENT: Appelé quand le filtre de département change
 */
onUserDepartmentFilterChange() {
  console.log('🏢 onUserDepartmentFilterChange appelé, nouveau département:', `"${this.userDepartmentFilter}"`);
  this.filterAvailableUsers();
}

/**
 * 🎭 ÉVÉNEMENT: Appelé quand le filtre de rôle change
 */
onUserRoleFilterChange() {
  console.log('🎭 onUserRoleFilterChange appelé, nouveau rôle:', `"${this.userRoleFilter}"`);
  this.filterAvailableUsers();
}

/**
 * 🧹 RESET: Remet à zéro tous les filtres utilisateurs
 */
resetUserFilters() {
  console.log('🧹 Reset des filtres utilisateurs');
  this.userSearchText = '';
  this.userDepartmentFilter = '';
  this.userRoleFilter = '';
  this.filteredAvailableUsers.set([...this.availableUsers()]);
  console.log(`✅ Filtres remis à zéro, ${this.filteredAvailableUsers().length} utilisateurs affichés`);
}

/**
 * 🔧 NOUVEAU: Validation intelligente des filtres après changement de données
 */
private validateAndCleanFilters() {
  console.log('🔍 Validation des filtres après changement de données...');
  
  let hasChanged = false;
  
  // Vérifier si le département filtré existe encore
  if (this.userDepartmentFilter) {
    const availableDepts = this.getAvailableDepartments();
    if (!availableDepts.includes(this.userDepartmentFilter)) {
      console.log(`⚠️ Département filtré "${this.userDepartmentFilter}" n'existe plus, reset...`);
      this.userDepartmentFilter = '';
      hasChanged = true;
    }
  }
  
  // Vérifier si le rôle filtré existe encore
  if (this.userRoleFilter) {
    const availableRoles = this.getAvailableUserRoles();
    if (!availableRoles.includes(this.userRoleFilter)) {
      console.log(`⚠️ Rôle filtré "${this.userRoleFilter}" n'existe plus, reset...`);
      this.userRoleFilter = '';
      hasChanged = true;
    }
  }
  
  // Si des filtres ont été nettoyés, relancer le filtrage
  if (hasChanged) {
    console.log('🔄 Filtres nettoyés, relance du filtrage...');
    this.filterAvailableUsers();
  }
  
  return hasChanged;
}

/**
 * 📊 Obtenir des statistiques détaillées sur les filtres
 */
getFilterStatistics(): any {
  const stats = {
    total: this.availableUsers().length,
    filtered: this.filteredAvailableUsers().length,
    activeFilters: {
      search: !!this.userSearchText.trim(),
      department: !!this.userDepartmentFilter,
      role: !!this.userRoleFilter
    },
    availableOptions: {
      departments: this.getAvailableDepartments(),
      roles: this.getAvailableUserRoles()
    },
    distribution: {
      byDepartment: this.getUserCountByDepartment(),
      byRole: this.getUserCountByRole()
    }
  };
  
  console.log('📊 Statistiques des filtres:', stats);
  return stats;
}

/**
 * 📊 Obtenir la liste des départements présents dans les utilisateurs disponibles - VERSION DYNAMIQUE
 */
getAvailableDepartments(): string[] {
  console.log('🏢 Extraction des départements dynamiques...');
  
  const departments = new Set<string>();
  
  this.availableUsers().forEach(user => {
    // 🔧 Vérifier toutes les propriétés possibles pour le département
    const dept = user.department || user.departement || user.Department || user.dept;
    
    if (dept && typeof dept === 'string' && dept.trim()) {
      const cleanDept = dept.trim();
      departments.add(cleanDept);
      console.log(`   → Département trouvé: "${cleanDept}" (utilisateur: ${user.firstName} ${user.lastName})`);
    }
  });
  
  const departmentList = Array.from(departments).sort();
  console.log(`🏢 ${departmentList.length} département(s) dynamique(s) détecté(s):`, departmentList);
  
  return departmentList;
}

/**
 * 📊 Obtenir la liste des rôles présents dans les utilisateurs disponibles - VERSION DYNAMIQUE
 */
getAvailableUserRoles(): string[] {
  console.log('🎭 Extraction des rôles dynamiques...');
  
  const roles = new Set<string>();
  
  this.availableUsers().forEach(user => {
    if (user.role) {
      const role = typeof user.role === 'string' ? user.role : user.role.toString();
      if (role.trim()) {
        roles.add(role.trim());
        console.log(`   → Rôle trouvé: "${role}" (utilisateur: ${user.firstName} ${user.lastName})`);
      }
    }
  });
  
  const roleList = Array.from(roles).sort();
  console.log(`🎭 ${roleList.length} rôle(s) dynamique(s) détecté(s):`, roleList);
  
  return roleList;
}

/**
 * 🔢 Obtenir le nombre d'utilisateurs par département
 */
getUserCountByDepartment(): { [department: string]: number } {
  const counts: { [department: string]: number } = {};
  
  this.filteredAvailableUsers().forEach(user => {
    const dept = user.department || user.departement || 'Non défini';
    counts[dept] = (counts[dept] || 0) + 1;
  });
  
  return counts;
}

/**
 * 🔢 Obtenir le nombre d'utilisateurs par rôle
 */
getUserCountByRole(): { [role: string]: number } {
  const counts: { [role: string]: number } = {};
  
  this.filteredAvailableUsers().forEach(user => {
    const role = user.role || 'Non défini';
    counts[role] = (counts[role] || 0) + 1;
  });
  
  return counts;
}



}