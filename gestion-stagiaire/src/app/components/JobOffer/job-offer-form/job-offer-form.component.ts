// job-offer-form.component.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { JobOfferService, CreateJobOfferDto, UpdateJobOfferDto, JobOfferDto } from '../../../services/JobOffer/job-offer.service';
import { UserService } from '../../../services/User/user.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { Department } from '../../../components/models/user';

@Component({
  selector: 'app-job-offer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './job-offer-form.component.html',
  styleUrls: ['./job-offer-form.component.scss']
})
export class JobOfferFormComponent implements OnInit {
  // Injection des services
  private fb = inject(FormBuilder);
  private jobOfferService = inject(JobOfferService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals pour la gestion d'état
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  departments = signal<Department[]>([]);
  currentUser = signal<any>(null);
  editMode = signal(false);
  jobOfferId = signal<number | null>(null);
  currentJobOffer = signal<JobOfferDto | null>(null);

  // Formulaire réactif
  jobOfferForm!: FormGroup; // Utilisation de l'assertion definite assignment

  // Computed values
  formTitle = computed(() => 
    this.editMode() ? 'Modifier l\'offre d\'emploi' : 'Créer une nouvelle offre d\'emploi'
  );

  submitButtonText = computed(() => 
    this.saving() 
      ? (this.editMode() ? 'Modification...' : 'Création...') 
      : (this.editMode() ? 'Modifier l\'offre' : 'Créer l\'offre')
  );

  // Computed pour le département sélectionné
  selectedDepartmentName = computed(() => {
    const deptId = this.jobOfferForm?.value?.departmentId;
    if (!deptId) return 'Département non sélectionné';
    const dept = this.departments().find(d => d.id === +deptId);
    return dept?.departmentName || 'Département non sélectionné';
  });

  // Skills management
  skillsArray = signal<string[]>([]);
  newSkill = signal('');

  constructor() {
    this.initializeForm();
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadDepartments();
    this.checkEditMode();
  }

  private initializeForm() {
    this.jobOfferForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(5000)]],
      requiredSkills: ['', [Validators.required, Validators.maxLength(2000)]],
      departmentId: [null, [Validators.required]]
    });
  }

  private loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        
        // Vérifier que l'utilisateur est RH
        if (!user || user.role !== 'RHs') {
          this.error.set('Seuls les utilisateurs RH peuvent créer des offres d\'emploi');
          setTimeout(() => this.router.navigate(['/job-offers']), 3000);
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
        this.error.set('Erreur d\'authentification');
      }
    });
  }

  private loadDepartments() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const uniqueDepts = new Map<number, Department>();
        users.forEach(user => {
          if (user.department) {
            uniqueDepts.set(user.department.id, user.department);
          }
        });
        this.departments.set(Array.from(uniqueDepts.values()));
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des départements:', error);
      }
    });
  }

  private checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode.set(true);
      this.jobOfferId.set(+id);
      this.loadJobOfferForEdit(+id);
    }
  }

  private loadJobOfferForEdit(id: number) {
    this.loading.set(true);
    
    this.jobOfferService.getJobOfferById(id).subscribe({
      next: (jobOffer) => {
        this.currentJobOffer.set(jobOffer);
        this.populateForm(jobOffer);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement de l\'offre:', error);
        this.error.set('Impossible de charger l\'offre d\'emploi');
        this.loading.set(false);
      }
    });
  }

  private populateForm(jobOffer: JobOfferDto) {
    this.jobOfferForm.patchValue({
      title: jobOffer.title,
      description: jobOffer.description,
      requiredSkills: jobOffer.requiredSkills,
      departmentId: jobOffer.departmentId
    });

    // Charger les compétences dans le tableau
    const skills = this.jobOfferService.formatSkills(jobOffer.requiredSkills);
    this.skillsArray.set(skills);
  }

  // Gestion des compétences
  addSkill() {
    const skill = this.newSkill().trim();
    if (skill && !this.skillsArray().includes(skill)) {
      this.skillsArray.update(skills => [...skills, skill]);
      this.updateSkillsInForm();
      this.newSkill.set('');
    }
  }

  removeSkill(index: number) {
    this.skillsArray.update(skills => skills.filter((_, i) => i !== index));
    this.updateSkillsInForm();
  }

  private updateSkillsInForm() {
    const skillsString = this.skillsArray().join(', ');
    this.jobOfferForm.patchValue({ requiredSkills: skillsString });
  }

  onSkillKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSkill();
    }
  }

  // Validation et soumission
  onSubmit() {
    if (this.jobOfferForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.editMode()) {
      this.updateJobOffer();
    } else {
      this.createJobOffer();
    }
  }

  private createJobOffer() {
    this.saving.set(true);
    this.error.set(null);

    const formValue = this.jobOfferForm.value;
    const createDto: CreateJobOfferDto = {
      title: formValue.title,
      description: formValue.description,
      requiredSkills: formValue.requiredSkills,
      departmentId: formValue.departmentId
    };

    this.jobOfferService.createJobOffer(createDto).subscribe({
      next: (createdOffer) => {
        console.log('✅ Offre créée avec succès:', createdOffer);
        this.saving.set(false);
        this.router.navigate(['/job-offers', createdOffer.id]);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création:', error);
        this.error.set(error.message || 'Erreur lors de la création de l\'offre');
        this.saving.set(false);
      }
    });
  }

  private updateJobOffer() {
    if (!this.jobOfferId()) return;

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.jobOfferForm.value;
    const updateDto: UpdateJobOfferDto = {
      title: formValue.title,
      description: formValue.description,
      requiredSkills: formValue.requiredSkills,
      departmentId: formValue.departmentId
    };

    this.jobOfferService.updateJobOffer(this.jobOfferId()!, updateDto).subscribe({
      next: (updatedOffer) => {
        console.log('✅ Offre mise à jour avec succès:', updatedOffer);
        this.saving.set(false);
        this.router.navigate(['/job-offers', updatedOffer.id]);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour:', error);
        this.error.set(error.message || 'Erreur lors de la mise à jour de l\'offre');
        this.saving.set(false);
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.jobOfferForm.controls).forEach(key => {
      const control = this.jobOfferForm.get(key);
      control?.markAsTouched();
    });
  }

  // Navigation
  goBack() {
    this.router.navigate(['/job-offers']);
  }

  // Helpers pour le template
  getFieldError(fieldName: string): string | null {
    const field = this.jobOfferForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) {
        return this.getFieldDisplayName(fieldName) + ' est obligatoire';
      }
      if (field.errors['maxlength']) {
        const maxLength = field.errors['maxlength'].requiredLength;
        return this.getFieldDisplayName(fieldName) + ` ne peut pas dépasser ${maxLength} caractères`;
      }
    }
    return null;
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      title: 'Le titre',
      description: 'La description',
      requiredSkills: 'Les compétences requises',
      departmentId: 'Le département'
    };
    return displayNames[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.jobOfferForm.get(fieldName);
    return !!(field?.touched && field?.errors);
  }

  getCharacterCount(fieldName: string): number {
    const field = this.jobOfferForm.get(fieldName);
    return field?.value?.length || 0;
  }

  getMaxLength(fieldName: string): number {
    const maxLengths: { [key: string]: number } = {
      title: 200,
      description: 5000,
      requiredSkills: 2000
    };
    return maxLengths[fieldName] || 0;
  }

  // Méthodes pour accéder aux valeurs du formulaire de manière sécurisée
  getFormValue(fieldName: string): any {
    return this.jobOfferForm?.get(fieldName)?.value || '';
  }

  hasFormValue(fieldName: string): boolean {
    const value = this.getFormValue(fieldName);
    return value && value.toString().trim().length > 0;
  }
}