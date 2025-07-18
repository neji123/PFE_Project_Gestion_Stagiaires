import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../Auth/auth-service.service';
import { DepartmentService } from '../../services/Department/department.service';
import { UniversityService } from '../../services/University/university.service';
import { Department, StageType, EducationLevel, University, UserRole } from '../../components/models/user';
import { Observable, of, forkJoin, catchError } from 'rxjs';
import { tap } from 'rxjs/operators';

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatCardModule,
    MatInputModule,   
    MatButtonModule 
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  loading = false;
  submittedLogin = false;
  submittedRegister = false;
  error = '';
  returnUrl: string = '/';
  hideLoginPassword = true;
  hideRegisterPassword = true;
  isActive = false; // Controls the slide animation
  selectedFile: File | null = null;
  photoPreview: string | ArrayBuffer | null = null;
  
  // Pour les sélecteurs
  departments: Department[] = [];
  stageTypes = Object.values(StageType);
  educationLevels = Object.values(EducationLevel);
  universities: University[] = [];
  dataLoaded = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private departmentService: DepartmentService,
    private universityService: UniversityService
  ) {
    // Redirect to home if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });

    // Charger les départements et universités
    this.loadInitialData();

    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      // Champ rôle caché et prédéfini comme Stagiaire
      role: [UserRole.Stagiaire],
      // Nouveaux champs
      departmentId: [null, [Validators.required]],
      universityId: [null],
      stage: [null],
      etudiant: [null],
      startDate: [null],
      endDate: [null],
      remember: [false]
    }, { validators: passwordMatchValidator() });

    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // Charger toutes les données initiales
  loadInitialData(): void {
    this.loading = true;
    
    // Utiliser forkJoin pour exécuter plusieurs requêtes en parallèle
    forkJoin({
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
          departments: [],
          universities: []
        });
      })
    ).subscribe({
      next: (results) => {
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

  // Getters for form controls
  get loginControls() { return this.loginForm.controls; }
  get registerControls() { return this.registerForm.controls; }

// Dans login.component.ts, modifions la méthode onLoginSubmit

onLoginSubmit(): void {
  this.submittedLogin = true;
  console.log('Tentative de connexion avec:', this.loginControls['username'].value);
  
  // Stop if form is invalid
  if (this.loginForm.invalid) {
    return;
  }
  
  this.loading = true;
  this.authService.login(this.loginControls['username'].value, this.loginControls['password'].value)
    .subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        console.log('User in response:', response.user);
        console.log('Token in response:', response.token);
        
        // S'assurer que les données sont bien stockées
        if (response.user) {
          console.log('Storing user manually');
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        }
        if (response.token) {
          console.log('Storing token manually');
          localStorage.setItem('auth_token', response.token);
        }
        
        // Vérification après stockage
        setTimeout(() => {
          console.log('Stored user:', localStorage.getItem('currentUser'));
          console.log('Stored token:', localStorage.getItem('auth_token'));
          
          // Rafraîchir les données utilisateur
          this.authService.refreshUserData();
          
          // Rediriger vers la page demandée ou dashboard
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/Accueil';
          console.log('Navigation vers:', returnUrl);
          this.router.navigateByUrl(returnUrl);
        }, 100);
      },
      error: (error) => {
        console.error('Login error:', error);
        // Personnalisation du message d'erreur pour le statut inactif
        if (error.message && error.message.includes('pas autorisé')) {
          this.error = 'Vous n\'êtes pas autorisé à vous connecter à l\'application. Veuillez contacter l\'administration.';
        } else {
          this.error = error.message || 'Nom d\'utilisateur ou mot de passe incorrect';
        }
        this.loading = false;
      }
    });
}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('File selected:', this.selectedFile.name);
      
      // Afficher un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  validateDates(): void {
    const startDate = this.registerForm.get('startDate')?.value;
    const endDate = this.registerForm.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.registerForm.get('endDate')?.setErrors({ 'invalidDate': true });
    } else {
      const endDateControl = this.registerForm.get('endDate');
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

  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    
    if (field === 'email' && control.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    
    if (field === 'password' && control.hasError('minlength')) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (field === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas';
    }
    
    return 'Champ invalide';
  }

  onRegisterSubmit(): void {
    this.submittedRegister = true;
  
    // Stop if form is invalid
    if (this.registerForm.invalid) {
      console.log('Form validation errors:', this.registerForm.errors);
      return;
    }
    
    this.loading = true;
    
    // Create FormData correctly
    const formData = new FormData();
    
    // Add all form fields as separate parts
    formData.append('Username', this.registerControls['username'].value);
    formData.append('Email', this.registerControls['email'].value);
    formData.append('Password', this.registerControls['password'].value);
    formData.append('ConfirmPassword', this.registerControls['confirmPassword'].value);
    formData.append('FirstName', this.registerControls['firstName'].value);
    formData.append('LastName', this.registerControls['lastName'].value);
    formData.append('PhoneNumber', this.registerControls['phoneNumber'].value);
    formData.append('Role', this.registerControls['role'].value);
    
    // Ajouter les nouveaux champs
    if (this.registerControls['departmentId'].value) {
      formData.append('DepartmentId', this.registerControls['departmentId'].value);
    }
    
    if (this.registerControls['universityId'].value) {
      formData.append('UniversityId', this.registerControls['universityId'].value);
    }
    
    if (this.registerControls['stage'].value) {
      formData.append('Stage', this.registerControls['stage'].value);
    }
    
    if (this.registerControls['etudiant'].value) {
      formData.append('Etudiant', this.registerControls['etudiant'].value);
    }
    
    if (this.registerControls['startDate'].value) {
      formData.append('StartDate', new Date(this.registerControls['startDate'].value).toISOString());
    }
    
    if (this.registerControls['endDate'].value) {
      formData.append('EndDate', new Date(this.registerControls['endDate'].value).toISOString());
    }
    
    // Add the profile picture if selected
    if (this.selectedFile) {
      formData.append('ProfilePicture', this.selectedFile);
    }
    
    console.log('Sending registration data');
    
this.authService.registerWithFormData(formData).subscribe({
  next: (response) => {
    console.log('=== SUCCÈS REGISTRATION ===');
    console.log('Registration successful:', response);
    
    // Afficher message de succès si fourni
    if (response.message) {
      alert(response.message);
    }
    
    // Basculer vers la vue de connexion
    this.toggleActive(false);
    this.error = '';
    
    // Réinitialiser le formulaire
    this.registerForm.reset();
    this.selectedFile = null;
    this.photoPreview = null;
    this.submittedRegister = false;
    this.loading = false;
  },
  error: (error) => {
    console.error('=== ERREUR REGISTRATION ===');
    console.error('Registration error:', error);
    console.log('Type de l\'erreur:', typeof error);
    console.log('error.message:', error.message);
    console.log('error.status:', error.status);
    console.log('error.originalError:', error.originalError);
    
    // Afficher le message d'erreur spécifique du serveur
    this.error = error.message || 'Une erreur s\'est produite lors de la création du compte.';
    
    console.log('=== MESSAGE D\'ERREUR AFFICHÉ:', this.error, '===');
    this.loading = false;
  }
});
  }

  toggleActive(isSignUp: boolean): void {
    this.isActive = isSignUp;
    // Reset forms and errors when switching views
    if (isSignUp) {
      this.submittedLogin = false;
    } else {
      this.submittedRegister = false;
    }
    this.error = '';
  }

  onPhoneNumberInput(event: any): void {
  let value = event.target.value;
  
  // Enlever tous les caractères non numériques sauf le +
  value = value.replace(/[^\d+]/g, '');
  
  // Si l'utilisateur commence à taper et n'a pas encore +216, l'ajouter automatiquement
  if (value.length > 0 && !value.startsWith('+216')) {
    if (value.startsWith('+')) {
      // Si ça commence par + mais pas +216, remplacer
      value = '+216' + value.substring(1);
    } else {
      
      value = '+216' + value;
    }
  }
  
  // Limiter à +216 + 8 chiffres (total 12 caractères)
  if (value.length > 12) {
    value = value.substring(0, 12);
  }
  
  // Mettre à jour le champ
  this.registerForm.get('phoneNumber')?.setValue(value);
}
  
}