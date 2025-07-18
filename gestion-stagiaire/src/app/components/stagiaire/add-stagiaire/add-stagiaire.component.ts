import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { UserService } from '../../../services/User/user.service';
import { DepartmentService } from '../../../services/Department/department.service';
import { UniversityService } from '../../../services/University/university.service';
import { Observable, of, forkJoin, catchError, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Department, StageType, EducationLevel, University, UserRole } from '../../models/user';

// Validator pour vérifier que les mots de passe correspondent
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

// Interface pour les tuteurs
interface Tuteur {
  id: number;
  name: string;
}

@Component({
  selector: 'app-add-stagiaire',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule
  ],
  templateUrl: './add-stagiaire.component.html',
  styleUrls: ['./add-stagiaire.component.scss']
})
export class AddStagiaireComponent implements OnInit {
  stagiaireForm: FormGroup;
  photoPreview: string | ArrayBuffer | null = null;
  profilePicture: File | null = null;
  hidePassword = true;
  loading = false;
  error: string | null = null;
  isEditMode = false;
  modalTitle = 'Ajouter un Stagiaire';
  tuteurs: Tuteur[] = [];
  
  // Listes pour les sélecteurs
  departments: Department[] = [];
  stageTypes = Object.values(StageType);
  educationLevels = Object.values(EducationLevel);
  universities: University[] = [];
  dataLoaded = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddStagiaireComponent>,
    private userService: UserService,
    private departmentService: DepartmentService,
    private universityService: UniversityService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    console.log("Données reçues dans la modal:", data);
    
    this.isEditMode = data?.isEditMode || false;
    this.modalTitle = this.isEditMode ? 'Modifier un Stagiaire' : 'Ajouter un Stagiaire';
    
    this.stagiaireForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [this.isEditMode ? '' : '', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      confirmPassword: [this.isEditMode ? '' : '', this.isEditMode ? [] : [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      tuteurId: [null],
      startDate: [null],
      endDate: [null],
      departmentId: [null, [Validators.required]],
      universityId: [null],
      stage: [null],
      etudiant: [null],
      status: [true],
      role: [UserRole.Stagiaire] // Valeur par défaut pour le rôle (Stagiaire)
    }, { 
      validators: this.isEditMode ? [] : passwordMatchValidator 
    });
  }

  ngOnInit(): void {
    // Charger les données nécessaires (tuteurs, départements, universités)
    this.loadInitialData();
    
    // Si on est en mode édition, remplir le formulaire avec les données de l'utilisateur
    if (this.isEditMode && this.data?.user) {
      console.log("Pré-remplissage du formulaire en mode édition");
      this.prepopulateForm(this.data.user);
    }
  }
  
  // Charger toutes les données initiales
  loadInitialData(): void {
    this.loading = true;
    
    // Utiliser forkJoin pour exécuter plusieurs requêtes en parallèle
    forkJoin({
      tuteurs: this.loadTuteurs(),
      departments: this.departmentService.getAllDepartments(),
      universities: this.universityService.getAllUniversities()
    }).pipe(
      tap(results => {
        console.log('Données chargées:', results);
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des données:', error);
        this.error = 'Erreur lors du chargement des données. Veuillez réessayer.';
        return of({
          tuteurs: [],
          departments: [],
          universities: []
        });
      })
    ).subscribe({
      next: (results) => {
        this.tuteurs = results.tuteurs;
        this.departments = results.departments;
        this.universities = results.universities;
        this.dataLoaded = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.error = 'Erreur lors du chargement des données. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }
  
  // Charger les tuteurs disponibles
  loadTuteurs(): Observable<Tuteur[]> {
    return this.userService.getUsersByRole(UserRole.Tuteur.toString()).pipe(
      map(tuteurs => {
        return tuteurs.map(tuteur => ({
          id: tuteur.id,
          name: `${tuteur.firstName} ${tuteur.lastName}`
        }));
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des tuteurs:', error);
        // Tuteurs par défaut pour les tests
        return of([
          { id: 1, name: 'Jean Mentor' },
          { id: 2, name: 'Marie Coach' },
          { id: 3, name: 'Pierre Formateur' }
        ]);
      })
    );
  }
  
  // Méthode pour pré-remplir le formulaire en mode édition
  prepopulateForm(userData: any): void {
    console.log('Pré-remplissage du formulaire avec les données:', userData);
    
    // Conversion des dates au format ISO pour les champs date
    const startDate = userData.startDate ? this.formatDateForInput(new Date(userData.startDate)) : null;
    const endDate = userData.endDate ? this.formatDateForInput(new Date(userData.endDate)) : null;
    
    // Assurez-vous que toutes les propriétés existent
    const formData = {
      username: userData.username || '',
      email: userData.email || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phoneNumber: userData.phoneNumber || '',
      tuteurId: userData.tuteurId || null,
      startDate: startDate,
      endDate: endDate,
      departmentId: userData.departmentId || null,
      universityId: userData.universityId || null,
      stage: userData.stage || null,
      etudiant: userData.etudiant || null,
      status: userData.status !== undefined ? userData.status : true,
      role: userData.role || UserRole.Stagiaire.toString()
    };
    
    // Mettre à jour le formulaire
    this.stagiaireForm.patchValue(formData);
    
    // Vérifiez si l'image existe avant de l'afficher
    if (userData.profilePictureUrl) {
      // Si c'est une URL relative, assurez-vous d'ajouter l'URL complète
      if (userData.profilePictureUrl.startsWith('http')) {
        this.photoPreview = userData.profilePictureUrl;
      } else {
        // Utilisez l'URL complète du backend
        const baseUrl = environment.apiUrl;
        this.photoPreview = `${baseUrl}${userData.profilePictureUrl}`;
      }
    }
    
    console.log('Formulaire mis à jour avec succès:', this.stagiaireForm.value);
  }

  // Format de date pour les input type="date"
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  getErrorMessage(field: string): string {
    const control = this.stagiaireForm.get(field);
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    
    if (field === 'email' && control.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    
    if (field === 'password' && control.hasError('minlength')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (field === 'confirmPassword' && this.stagiaireForm.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas';
    }
    
    return 'Champ invalide';
  }

  validateDates(): void {
    const startDate = this.stagiaireForm.get('startDate')?.value;
    const endDate = this.stagiaireForm.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.stagiaireForm.get('endDate')?.setErrors({ 'invalidDate': true });
    } else {
      const endDateControl = this.stagiaireForm.get('endDate');
      if (endDateControl?.hasError('invalidDate')) {
        // Récupérer les erreurs actuelles
        const errors = { ...endDateControl.errors };
        // Supprimer l'erreur 'invalidDate'
        delete errors['invalidDate'];
        // Réappliquer les erreurs restantes, s'il y en a
        endDateControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  }

  onSubmit(): void {
    // En mode édition, le mot de passe n'est pas obligatoire
    if (this.isEditMode) {
      // Si les champs de mot de passe sont remplis, vérifier qu'ils correspondent
      const password = this.stagiaireForm.get('password')?.value;
      const confirmPassword = this.stagiaireForm.get('confirmPassword')?.value;
      
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          this.stagiaireForm.setErrors({ passwordMismatch: true });
          return;
        }
      }
    }
    
    if (this.stagiaireForm.valid) {
      this.loading = true;
      
      // Préparer les données à retourner au composant parent
      const formValue = {...this.stagiaireForm.value};
      
      // Convertir les dates au format ISO
      if (formValue.startDate) {
        formValue.startDate = new Date(formValue.startDate).toISOString();
      }
      if (formValue.endDate) {
        formValue.endDate = new Date(formValue.endDate).toISOString();
      }
      
      // Normalisation des champs
      if (formValue.tuteurId === null || formValue.tuteurId === undefined) {
        formValue.tuteurId = '';
      }
      
      if (formValue.universityId === null || formValue.universityId === undefined) {
        formValue.universityId = '';
      }
      
      // Vérifier que nous avons un departmentId valide
      if (formValue.departmentId === null || formValue.departmentId === undefined) {
        formValue.departmentId = 1; // Valeur par défaut
      }
      
      // Vérifier que stage et etudiant sont des valeurs valides
      if (formValue.stage === null || formValue.stage === undefined) {
        formValue.stage = 'stage_année'; // Valeur par défaut
      }
      
      if (formValue.etudiant === null || formValue.etudiant === undefined) {
        formValue.etudiant = 'licence'; // Valeur par défaut
      }
      
      // Préparer l'objet final à envoyer
      const result = {
        ...formValue,
        profilePicture: this.profilePicture
      };
      
      console.log('Données soumises:', result);
      
      // Simuler un délai de chargement (à enlever en production)
      setTimeout(() => {
        this.loading = false;
        this.dialogRef.close(result);
      }, 500);
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.stagiaireForm);
    }
  }
  
  // Méthode utilitaire pour marquer tous les champs du formulaire comme touchés
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.profilePicture = input.files[0];
      
      // Afficher un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result;
      };
      reader.readAsDataURL(this.profilePicture);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
  /*
  // Méthodes de débogage
  logDepartmentsData(): void {
    console.log('Départements:', this.departments);
  }
  
  // Dans add-stagiaire.component.ts
logUniversitiesData(): void {
  console.log('Liste des universités:', this.universities);
  if (this.universities && this.universities.length > 0) {
    console.log('Structure de la première université:', this.universities[0]);
    console.log('Propriétés disponibles:', Object.keys(this.universities[0]));
  }
}
  
  logTuteursData(): void {
    console.log('Tuteurs:', this.tuteurs);
  }*/
}