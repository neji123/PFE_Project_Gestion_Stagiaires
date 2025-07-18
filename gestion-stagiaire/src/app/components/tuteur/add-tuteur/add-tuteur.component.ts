import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { UserService } from '../../../services/User/user.service';
import { DepartmentService } from '../../../services/Department/department.service';
import { Observable, of, forkJoin, catchError, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Department, UserRole } from '../../models/user';

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
  selector: 'app-add-tuteur',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule
  ],
  templateUrl: './add-tuteur.component.html',
  styleUrls: ['./add-tuteur.component.scss']
})
export class AddTuteurComponent implements OnInit {
  tuteurForm: FormGroup;
  photoPreview: string | ArrayBuffer | null = null;
  profilePicture: File | null = null;
  hidePassword = true;
  loading = false;
  error: string | null = null;
  isEditMode = false;
  modalTitle = 'Ajouter un Tuteur';
  
  // Listes pour les sélecteurs
  departments: Department[] = [];
  dataLoaded = false;
  
  // Années d'expérience
  yearsOptions = Array.from({ length: 31 }, (_, i) => i); // 0 à 30 ans

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddTuteurComponent>,
    private userService: UserService,
    private departmentService: DepartmentService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    console.log("Données reçues dans la modal:", data);
    
    this.isEditMode = data?.isEditMode || false;
    this.modalTitle = this.isEditMode ? 'Modifier un Tuteur' : 'Ajouter un Tuteur';
    
    this.tuteurForm = this.fb.group({
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
      role: [UserRole.Tuteur] // Valeur par défaut pour le rôle (Tuteur)
    }, { 
      validators: this.isEditMode ? [] : passwordMatchValidator 
    });
  }

  ngOnInit(): void {
    // Charger les données nécessaires (départements)
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
    this.tuteurForm.patchValue(formData);
    
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
    
    console.log('Formulaire mis à jour avec succès:', this.tuteurForm.value);
  }

    // Format de date pour les input type="date"
    formatDateForInput(date: Date): string {
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      return `${year}-${month}-${day}`;
    }
  getErrorMessage(field: string): string {
    const control = this.tuteurForm.get(field);
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
    
    if (field === 'confirmPassword' && this.tuteurForm.errors?.['passwordMismatch']) {
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
    const startDate = this.tuteurForm.get('startDate')?.value;
    const endDate = this.tuteurForm.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.tuteurForm.get('endDate')?.setErrors({ 'invalidDate': true });
    } else {
      const endDateControl = this.tuteurForm.get('endDate');
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
      const password = this.tuteurForm.get('password')?.value;
      const confirmPassword = this.tuteurForm.get('confirmPassword')?.value;
      
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          this.tuteurForm.setErrors({ passwordMismatch: true });
          return;
        }
      }
    }
    
    if (this.tuteurForm.valid) {
      this.loading = true;
      
      // Création d'un objet FormData pour l'envoi multipart/form-data
      const formData = new FormData();
      
      // Récupérer les valeurs du formulaire
      const formValue = this.tuteurForm.value;
      
       // Convertir les dates au format ISO
       if (formValue.startDate) {
        formValue.startDate = new Date(formValue.startDate).toISOString();
      }

        // Préparer l'objet final à envoyer
        const result = {
          ...formValue,
          profilePicture: this.profilePicture
        };
        console.log('Données soumises:', result);

  
        setTimeout(() => {
          this.loading = false;
          this.dialogRef.close(result);
        }, 500);
      } else {
        // Marquer tous les champs comme touchés pour afficher les erreurs
        this.markFormGroupTouched(this.tuteurForm);
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
  
  // Méthodes de débogage
  logDepartmentsData(): void {
    console.log('Départements:', this.departments);
  }
}