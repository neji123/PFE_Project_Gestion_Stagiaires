import { Component, OnInit,inject,AfterViewInit, ElementRef, ViewChild,NgZone } from '@angular/core';
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
import { Department, UserRole } from '../../components/models/user';
import { Observable, of, forkJoin, catchError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SocialAuthService, SocialLoginModule } from '@abacritt/angularx-social-login';
import { environment } from '../../environments/environment';
import { RouterModule } from '@angular/router';

declare global {
  interface Window {
    google?: any;
    angularComponentReference?: any;
  }
}

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
  selector: 'app-login-tuteur-rh',
  standalone: true,
  imports: [
    CommonModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatCardModule,
    MatInputModule,   
    MatButtonModule ,
    RouterModule
  ],
  templateUrl: './login-tuteur-rh.component.html',
  styleUrl: './login-tuteur-rh.component.scss'
})
export class LoginTuteurRhComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtn') googleBtn!: ElementRef;

  ngAfterViewInit() {
    // Attendez que l'API Google soit chargée
    const checkGoogleApi = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(checkGoogleApi);
        
        console.log('Google API loaded, initializing button...');
        
        // Initialiser et rendre le bouton
        window.google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: this.handleCredentialResponse.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        window.google.accounts.id.renderButton(
          this.googleBtn.nativeElement,
          { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
        );
        
        console.log('Google button rendered successfully');
      }
    }, 100);
  }
  

 handleCredentialResponse(response: any) {
  console.log("Google response received:", response);
  
  if (response && response.credential) {
    this.loading = true;
    
    // Utiliser le service d'authentification pour envoyer le token au backend
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: (res) => {
        console.log('Google login successful:', res);
        this.loading = false;
        this.router.navigate(['/Accueil']);
      },
      error: (err) => {
        console.error('Google login failed:', err);
        this.error = 'Échec de la connexion avec Google: ' + (err.message || 'Erreur inconnue');
        this.loading = false;
      }
    });
  } else {
    console.error('Invalid Google response:', response);
    this.error = 'Réponse Google invalide';
  }
}

  
  // Ajouter une méthode pour afficher un message à l'utilisateur
  openSnackBar(message: string, action: string) {
    // Si vous avez Angular Material:
    // this.snackBar.open(message, action, { duration: 5000 });
    
    // Sinon, utilisez une alerte simple:
    alert(message);
  }


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
  dataLoaded = false;
  private socialAuthService = inject(SocialAuthService);



  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private departmentService: DepartmentService,
    private zone: NgZone
  ) {
    (window as any).angularComponentReference = {
      component: this,
      zone: zone,
      handleCredentialResponse: this.handleCredentialResponse.bind(this)
    };
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

    // Charger les départements
    this.loadInitialData();

    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      // Champ rôle avec sélection entre RH et Tuteur
      role: [null, [Validators.required]],
      // Départment
      departmentId: [null, [Validators.required]],
      // Champ spécifique pour les tuteurs
      yearsExperience: [null],
      remember: [false]
    }, { validators: passwordMatchValidator() });

    // Ajouter un listener pour mettre à jour les validations en fonction du rôle
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      const yearsExperienceControl = this.registerForm.get('yearsExperience');
      
      if (role === 'Tuteur') {
        yearsExperienceControl?.setValidators([Validators.required]);
      } else {
        yearsExperienceControl?.clearValidators();
      }
      
      yearsExperienceControl?.updateValueAndValidity();
    });

    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // Charger les données initiales
  loadInitialData(): void {
    this.loading = true;
    
    this.departmentService.getAllDepartments()
      .pipe(
        tap(departments => {
          console.log('Départements chargés:', departments);
        }),
        catchError(error => {
          console.error('Erreur lors du chargement des départements:', error);
          this.error = 'Erreur lors du chargement des données. Veuillez réessayer.';
          return of([]);
        })
      )
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.dataLoaded = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des départements:', error);
          this.error = 'Erreur lors du chargement des données. Veuillez réessayer.';
          this.loading = false;
        }
      });
  }

  // Getters for form controls
  get loginControls() { return this.loginForm.controls; }
  get registerControls() { return this.registerForm.controls; }

  onLoginSubmit(): void {
    this.submittedLogin = true;
    
    if (this.loginForm.invalid) {
      return;
    }
    
    this.loading = true;
    this.authService.login(this.loginControls['username'].value, this.loginControls['password'].value)
      .subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          
          // Vérifiez si nous avons un token
          if (response && response.token) {
            // Extrayez les infos du token
            const token = response.token;
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const userRole = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
              
              console.log('Rôle extrait du token:', userRole);
              
              // Vérification du rôle
              if (userRole === 'Tuteur' || userRole === 'RHs') {
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/Accueil';
                this.router.navigateByUrl(returnUrl);
              } else {
                this.error = 'Vous n\'êtes pas autorisé à accéder à cette application. Seuls les tuteurs et le personnel RH peuvent se connecter ici.';
                this.authService.logout();
              }
            } else {
              this.error = 'Format de token invalide';
            }
          } else {
            this.error = 'Réponse du serveur invalide';
          }
          this.loading = false;
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
    
    if (this.registerControls['departmentId'].value) {
      formData.append('DepartmentId', this.registerControls['departmentId'].value);
    }
    
    // Ajouter les années d'expérience pour les tuteurs
    if (this.registerControls['role'].value === 'Tuteur' && this.registerControls['yearsExperience'].value) {
      formData.append('YearsExperience', this.registerControls['yearsExperience'].value);
    }
    
    // Add the profile picture if selected
    if (this.selectedFile) {
      formData.append('ProfilePicture', this.selectedFile);
    }
    
    console.log('Sending registration data');
    
    this.authService.registerWithFormData(formData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.toggleActive(false);
        this.error = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.error = error.message || 'Registration failed';
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

  signInWithGoogle(): void {
    this.authService.signInWithGoogle();
  }

  signInWithGoogleRedirect() {
    const redirectUri = encodeURIComponent(window.location.origin + '/auth-callback');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${environment.googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile&prompt=select_account`;
    window.location.href = authUrl;
  }
  
}