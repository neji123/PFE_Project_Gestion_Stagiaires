import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { environment } from '../../../environments/environment';
import { Department, UserRole } from '../../models/user';
import { DepartmentService } from '../../../services/Department/department.service';
import { UserService } from '../../../services/User/user.service';
import { Observable, of, forkJoin, catchError, tap } from 'rxjs';

// Validator pour vérifier que les mots de passe correspondent
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-add-rh',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './add-rh.component.html',
  styleUrls: ['./add-rh.component.scss']
})
export class AddRhModalComponent implements OnInit {
  rhForm: FormGroup;
  photoPreview: string | ArrayBuffer | null = null;
  profilePicture: File | null = null;
  hidePassword = true;
  loading = false;
  error: string | null = null;
  isEditMode = false;
  modalTitle = 'Ajouter un Responsable RH';

    // Listes pour les sélecteurs
    departments: Department[] = [];
    dataLoaded = false;
      // Années d'expérience
  yearsOptions = Array.from({ length: 31 }, (_, i) => i); // 0 à 30 ans
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddRhModalComponent>,
        private departmentService: DepartmentService,
    
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    console.log("Données reçues dans la modal:", data);
    
    this.isEditMode = data?.isEditMode || false;
    this.modalTitle = this.isEditMode ? 'Modifier un Responsable RH' : 'Ajouter un Responsable RH';
    
    this.rhForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [this.isEditMode ? '' : '', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      confirmPassword: [this.isEditMode ? '' : '', this.isEditMode ? [] : [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phoneNumber: ['', [Validators.required]],
      startDate: [null],
      yearsExperience: [0, [Validators.min(0), Validators.max(30)]],
      departmentId: [null, [Validators.required]],
      status: [true],
      role: ['RHs'] // Valeur par défaut pour le rôle (RH)
    
    }, { 
      validators: this.isEditMode ? [] : passwordMatchValidator 
    });
    
    // Si on est en mode édition, remplir le formulaire avec les données de l'utilisateur
    if (this.isEditMode && data?.user) {
      console.log("Appel de prepopulateForm depuis le constructeur");
      this.prepopulateForm(data.user);
    }
  }

  ngOnInit(): void {
    // Charger les données nécessaires (départements)
    this.loadInitialData();
    
    // Double vérification pour s'assurer que le formulaire est pré-rempli
    if (this.isEditMode && this.data?.user) {
      console.log("Appel de prepopulateForm depuis ngOnInit");
      this.prepopulateForm(this.data.user);
    }
  }

   // Charger toutes les données initiales
    loadInitialData(): void {
      this.loading = true;
      
      // Charger les départements
      this.departmentService.getAllDepartments().pipe(
        tap(departments => {
          console.log('Départements chargés:', departments);
        }),
        catchError(error => {
          console.error('Erreur lors du chargement des départements:', error);
          this.error = 'Erreur lors du chargement des données. Veuillez réessayer.';
          return of([]);
        })
      ).subscribe({
        next: (departments) => {
          this.departments = departments;
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
  
  // Méthode pour pré-remplir le formulaire en mode édition
  prepopulateForm(userData: any): void {
    console.log('Pré-remplissage du formulaire avec les données:', userData);
    const startDate = userData.startDate ? this.formatDateForInput(new Date(userData.startDate)) : null;

    // Assurez-vous que toutes les propriétés existent
    const formData = {
      username: userData.username || '',
      email: userData.email || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phoneNumber: userData.phoneNumber || '',
      startDate: startDate,
      yearsExperience: userData.yearsExperience || 0,
      departmentId: userData.departmentId || null,
      status: userData.status !== undefined ? userData.status : true,
      role: userData.role || UserRole.Tuteur.toString()
    };
    
    // Mettre à jour le formulaire
    this.rhForm.patchValue(formData);
    
     // Vérifiez si l'image existe avant de l'afficher
  if (userData.profilePictureUrl) {
    // Si c'est une URL relative, assurez-vous d'ajouter l'URL complète
    if (userData.profilePictureUrl.startsWith('http')) {
      this.photoPreview = userData.profilePictureUrl;
    } else {
      // Utilisez l'URL complète du backend
      const baseUrl = environment.apiUrl;
      this.photoPreview = `${baseUrl}${userData.profilePictureUrl}`;
      
      // Option alternative: utilisez une image par défaut en cas d'erreur
      // this.photoPreview = 'assets/images/default-profile.jpg';
    }
  }
    
    console.log('Formulaire mis à jour avec succès:', this.rhForm.value);
  }

    // Format de date pour les input type="date"
    formatDateForInput(date: Date): string {
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      return `${year}-${month}-${day}`;
    }
  getErrorMessage(field: string): string {
    const control = this.rhForm.get(field);
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
    
    if (field === 'confirmPassword' && this.rhForm.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas';
    }
    
    if (field === 'yearsExperience' && control.hasError('min')) {
      return 'L\'expérience ne peut pas être négative';
    }
    
    if (field === 'yearsExperience' && control.hasError('max')) {
      return 'L\'expérience ne peut pas dépasser 30 ans';
    }
    
    return 'Champ invalide';
  }

  validateDates(): void {
    const startDate = this.rhForm.get('startDate')?.value;
    const endDate = this.rhForm.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.rhForm.get('endDate')?.setErrors({ 'invalidDate': true });
    } else {
      const endDateControl = this.rhForm.get('endDate');
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
      const password = this.rhForm.get('password')?.value;
      const confirmPassword = this.rhForm.get('confirmPassword')?.value;
      
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          this.rhForm.setErrors({ passwordMismatch: true });
          return;
        }
      }
    }
    
    if (this.rhForm.valid) {
      this.loading = true;
      
      const formData = new FormData();
      
      // Récupérer les valeurs du formulaire
      const formValue = this.rhForm.value;
      
       // Convertir les dates au format ISO
       if (formValue.startDate) {
        formValue.startDate = new Date(formValue.startDate).toISOString();
      }
      // Préparer les données à retourner au composant parent
      const result = {
        ...this.rhForm.value,
        profilePicture: this.profilePicture
      };
      
      console.log('Données soumises:', result);
      
      // Simuler un délai de chargement (à enlever en production)
      setTimeout(() => {
        this.loading = false;
        this.dialogRef.close(result);
      }, 500);
    }else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.rhForm);
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
}