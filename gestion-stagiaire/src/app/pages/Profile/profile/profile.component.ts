import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router,RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SidebarComponent } from '../../../components/layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { DepartmentService } from '../../../services/Department/department.service';
import { environment } from '../../../environments/environment';
import { TuteurStagiairesComponent } from './tuteur-stagiaires/tuteur-stagiaires.component';
import { ProjectService } from '../../../services/Project/project.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressBarModule,
    SidebarComponent,
    TuteurStagiairesComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  isSidebarVisible = true;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  skillsForm!: FormGroup;
  
  user: any = null;
  departments: any[] = [];
  universities: any[] = [];
  tuteurs: any[] = [];
  
  isLoading = true;
  isEditing = false;
  isChangingPassword = false;
  isEditingSkills = false;
  isUploadingCv = false;
  
  selectedFile: File | null = null;
  selectedCvFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  
  currentRole: string = '';
  projetDuStagiaire: any = null;
  loadingProjets = false;
   private _isTuteur = false;
  
  // Nouvelles propriétés pour Skills et CV
  userSkills: string[] = [];
  userCvInfo: any = null;
  loadingCvInfo = false;
currentUser: any = null;
  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private departmentService: DepartmentService,
    private projectService: ProjectService, 
    private snackBar: MatSnackBar,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.initializeForms();
    this.loadCurrentUser();
    this.loadDepartments();
    
    // Charger les données spécifiques selon le rôle de l'utilisateur
    if (isPlatformBrowser(this.platformId)) {
      const userString = localStorage.getItem('currentUser');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          this.currentRole = user.role;
          
          if (user.role === 'Stagiaire') {
            this.loadTuteurs();
            // Charger le projet du stagiaire
            if (user.id) {
              this.loadProjetDuStagiaire(user.id);
            }
          }
          
          if (user.role === 'RHs' || user.role === 'Tuteur' || user.role === 'Admin') {
            this.loadUniversities();
          }
          
          // Charger les infos CV et compétences si l'utilisateur peut en avoir
          if (this.userService.canHaveSkillsAndCv(user.role) && user.id) {
            this.loadUserCvInfo(user.id);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
      }
    }
  }
    
  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
  
  private initializeForms(): void {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+216\d{8}$/)]],
      departmentId: [null],
      
      // Champs spécifiques par rôle
      // Stagiaire
      tuteurId: [null],
      startDate: [null],
      endDate: [null],
      universityId: [null],
      stage: [null],
      etudiant: [null],
      
      // Tuteur
      yearsExperience: [null]
    });
    
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });

    // Nouveau formulaire pour les compétences
    this.skillsForm = this.fb.group({
      skills: ['', [Validators.required, Validators.minLength(3)]]
    });
  }
  
  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }
  
  private loadCurrentUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const userString = localStorage.getItem('currentUser');
      if (userString) {
        try {
          const userData = JSON.parse(userString);
          
          if (userData.id) {
            this.userService.getUserById(userData.id).subscribe({
              next: (user) => {
                this.user = user;
                 this._isTuteur = user.role === 'Tuteur';
                this.populateForm(user);
                this.isLoading = false;
                
                // Définir l'aperçu de l'image de profil
                if (user.profilePictureUrl) {
                  this.imagePreview = this.getImageUrl(user.profilePictureUrl);
                }

                // Charger les compétences
                if (user.skills) {
                  this.userSkills = this.userService.formatSkills(user.skills);
                  this.skillsForm.patchValue({ skills: user.skills });
                }
              },
              error: (error) => {
                console.error('Erreur lors de la récupération des détails de l\'utilisateur:', error);
                this.isLoading = false;
                this.snackBar.open('Erreur lors du chargement du profil', 'Fermer', {
                  duration: 3000,
                  horizontalPosition: 'end',
                  verticalPosition: 'bottom'
                });
              }
            });
          } else {
            this.isLoading = false;
          }
        } catch (error) {
          console.error('Erreur lors de l\'analyse des données utilisateur:', error);
          this.isLoading = false;
        }
      } else {
        this.isLoading = false;
        this.router.navigate(['/login']);
      }
    }
  }

  // Nouvelle méthode pour charger les infos CV
  private loadUserCvInfo(userId: number): void {
    this.loadingCvInfo = true;
    this.userService.getUserCvInfo(userId).subscribe({
      next: (cvInfo) => {
        this.userCvInfo = cvInfo;
        this.loadingCvInfo = false;
        
        // Mettre à jour les compétences si elles existent
        if (cvInfo.skills) {
          this.userSkills = this.userService.formatSkills(cvInfo.skills);
          this.skillsForm.patchValue({ skills: cvInfo.skills });
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des infos CV:', error);
        this.loadingCvInfo = false;
      }
    });
  }
  
  private loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des départements:', error);
      }
    });
  }
  
  private loadTuteurs(): void {
    this.userService.getAllTuteurs().subscribe({
      next: (tuteurs) => {
        this.tuteurs = tuteurs;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des tuteurs:', error);
      }
    });
  }
  
  private loadUniversities(): void {
    // Exemple simplifié en attendant un service réel
    this.universities = [
      { id: 1, universityname: 'Université de Tunis' },
      { id: 2, universityname: 'Université de Carthage' },
      { id: 3, universityname: 'Université de Sousse' }
    ];
  }
  
  private populateForm(user: any): void {
    // Remplir les champs communs
    this.profileForm.patchValue({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      departmentId: user.departmentId
    });
    
    // Remplir les champs spécifiques au rôle
    if (user.role === 'Stagiaire') {
      this.profileForm.patchValue({
        tuteurId: user.tuteurId,
        startDate: user.startDate ? new Date(user.startDate) : null,
        endDate: user.endDate ? new Date(user.endDate) : null,
        universityId: user.universityId,
        stage: user.stage,
        etudiant: user.etudiant
      });
    } else if (user.role === 'Tuteur') {
      this.profileForm.patchValue({
        yearsExperience: user.yearsExperience
      });
    }
  }
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    
    if (file) {
      this.selectedFile = file;
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Nouvelle méthode pour la sélection du CV
  onCvFileSelected(event: any): void {
    const file = event.target.files[0];
    
    if (file) {
      // Valider le fichier
      const validation = this.userService.validateCvFile(file);
      
      if (!validation.valid) {
        this.snackBar.open(validation.error!, 'Fermer', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        return;
      }
      
      this.selectedCvFile = file;
      this.uploadCv();
    }
  }

  // Nouvelle méthode pour uploader le CV
  uploadCv(): void {
    if (!this.selectedCvFile || !this.user?.id) return;
    
    this.isUploadingCv = true;
    
    this.userService.uploadUserCv(this.user.id, this.selectedCvFile).subscribe({
      next: (response) => {
        this.snackBar.open('CV uploadé avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        // Recharger les infos CV
        this.loadUserCvInfo(this.user.id);
        this.selectedCvFile = null;
        this.isUploadingCv = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'upload du CV:', error);
        this.snackBar.open('Erreur lors de l\'upload du CV', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        this.isUploadingCv = false;
      }
    });
  }

  // Nouvelle méthode pour supprimer le CV
  deleteCv(): void {
    if (!this.user?.id) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer votre CV ?')) {
      this.userService.deleteUserCv(this.user.id).subscribe({
        next: (response) => {
          this.snackBar.open('CV supprimé avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
          
          // Recharger les infos CV
          this.loadUserCvInfo(this.user.id);
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du CV:', error);
          this.snackBar.open('Erreur lors de la suppression du CV', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
        }
      });
    }
  }

  // Nouvelle méthode pour télécharger le CV
downloadCv(): void {
  if (!this.user?.id || !this.userCvInfo?.hasCv) {
    this.snackBar.open('Aucun CV disponible pour le téléchargement', 'Fermer', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
    return;
  }

  console.log('🔄 Début du téléchargement du CV pour l\'utilisateur:', this.user.id);
  
  this.userService.downloadUserCv(this.user.id).subscribe({
    next: (blob: Blob) => {
      console.log('✅ Blob reçu:', blob);
      console.log('📊 Taille du blob:', blob.size);
      console.log('📄 Type du blob:', blob.type);
      
      // Vérifier que le blob n'est pas vide
      if (blob.size === 0) {
        console.error('❌ Le fichier téléchargé est vide');
        this.snackBar.open('Le fichier CV est vide ou corrompu', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        return;
      }
      
      try {
        // Créer l'URL du blob
        const url = window.URL.createObjectURL(blob);
        console.log('🔗 URL créée:', url);
        
        // Créer un élément <a> temporaire pour le téléchargement
        const link = document.createElement('a');
        link.href = url;
        
        // Déterminer le nom du fichier
        const fileName = this.userCvInfo.originalFileName || `cv_${this.user.username}.pdf`;
        link.download = fileName;
        
        console.log('📁 Nom du fichier:', fileName);
        
        // Ajouter temporairement l'élément au DOM
        document.body.appendChild(link);
        
        // Déclencher le téléchargement
        link.click();
        console.log('🎯 Clic de téléchargement déclenché');
        
        // Nettoyer
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('🧹 Nettoyage effectué');
        
        // Message de succès
        this.snackBar.open('CV téléchargé avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
      } catch (downloadError) {
        console.error('❌ Erreur lors de la création du téléchargement:', downloadError);
        this.snackBar.open('Erreur lors de la préparation du téléchargement', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
      }
    },
    error: (error) => {
      console.error('❌ Erreur lors du téléchargement du CV:', error);
      console.error('📋 Détails de l\'erreur:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });
      
      let errorMessage = 'Erreur lors du téléchargement du CV';
      
      // Messages d'erreur plus spécifiques
      if (error.status === 404) {
        errorMessage = 'CV non trouvé sur le serveur';
      } else if (error.status === 403) {
        errorMessage = 'Vous n\'avez pas l\'autorisation de télécharger ce CV';
      } else if (error.status === 500) {
        errorMessage = 'Erreur serveur lors du téléchargement';
      } else if (error.status === 0) {
        errorMessage = 'Impossible de joindre le serveur';
      }
      
      this.snackBar.open(errorMessage, 'Fermer', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    }
  });
}
  
  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    
    if (!this.isEditing) {
      // Réinitialiser le formulaire avec les valeurs actuelles de l'utilisateur
      this.populateForm(this.user);
      this.selectedFile = null;
      
      // Réinitialiser l'aperçu de l'image
      if (this.user.profilePictureUrl) {
        this.imagePreview = this.getImageUrl(this.user.profilePictureUrl);
      } else {
        this.imagePreview = null;
      }
    }
  }
  
  togglePasswordChange(): void {
    this.isChangingPassword = !this.isChangingPassword;
    
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
  }

  // Nouvelle méthode pour basculer l'édition des compétences
  toggleSkillsEdit(): void {
    this.isEditingSkills = !this.isEditingSkills;
    
    if (!this.isEditingSkills) {
      // Réinitialiser le formulaire des compétences
      this.skillsForm.patchValue({ 
        skills: this.user?.skills || this.userSkills.join(', ') 
      });
    }
  }

  // Nouvelle méthode pour sauvegarder les compétences
  saveSkills(): void {
    if (this.skillsForm.invalid || !this.user?.id) return;
    
    const skills = this.skillsForm.get('skills')?.value;
    
    this.userService.updateUserSkills(this.user.id, skills).subscribe({
      next: (response) => {
        this.snackBar.open('Compétences mises à jour avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        // Mettre à jour les compétences locales
        this.userSkills = this.userService.formatSkills(skills);
        this.user.skills = skills;
        this.isEditingSkills = false;
        
        // Recharger les infos CV
        this.loadUserCvInfo(this.user.id);
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour des compétences:', error);
        this.snackBar.open('Erreur lors de la mise à jour des compétences', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // Méthode pour ajouter une compétence via chip
  addSkill(skill: string): void {
    if (skill && !this.userSkills.includes(skill.trim())) {
      this.userSkills.push(skill.trim());
      this.skillsForm.patchValue({ 
        skills: this.userSkills.join(', ') 
      });
    }
  }

  // Méthode pour supprimer une compétence
  removeSkill(skillToRemove: string): void {
    this.userSkills = this.userSkills.filter(skill => skill !== skillToRemove);
    this.skillsForm.patchValue({ 
      skills: this.userSkills.join(', ') 
    });
  }
  
  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    
    const formData = new FormData();
    
    // Ajouter l'ID
    formData.append('Id', this.user.id.toString());
    
    // Ajouter les champs de base
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      if (control && control.value !== null && control.value !== undefined) {
        // Traitement spécial pour les dates
        if (key === 'startDate' || key === 'endDate') {
          if (control.value) {
            formData.append(key, new Date(control.value).toISOString());
          }
        } else {
          formData.append(key, control.value.toString());
        }
      }
    });
    
    // Ajouter le rôle
    formData.append('Role', this.user.role);
    
    // Ajouter l'image seulement si elle est fournie
    if (this.selectedFile) {
      formData.append('ProfilePicture', this.selectedFile);
    }
    
    // Utiliser la méthode appropriée selon le rôle
    let updateObservable;
    
    switch (this.user.role) {
      case 'Stagiaire':
        updateObservable = this.userService.updateStagiaireFormData(this.user.id, formData);
        break;
      case 'Tuteur':
        updateObservable = this.userService.updateTuteurFormData(this.user.id, formData);
        break;
      case 'RHs':
        updateObservable = this.userService.updateRhFormData(this.user.id, formData);
        break;
      default:
        updateObservable = this.userService.updateStagiaireFormData(this.user.id, formData);
    }
    
    updateObservable.subscribe({
      next: (response) => {
        this.snackBar.open('Profil mis à jour avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        // Mettre à jour l'utilisateur dans le localStorage
        if (isPlatformBrowser(this.platformId)) {
          // Créer un objet simplifié avec uniquement les informations nécessaires
          const simplifiedUser = {
            id: this.user.id,
            username: this.profileForm.get('username')?.value || this.user.username,
            email: this.profileForm.get('email')?.value || this.user.email,
            role: this.user.role
          };
          
          // Enregistrer dans le localStorage
          localStorage.setItem('currentUser', JSON.stringify(simplifiedUser));
        }
        
        this.isLoading = false;
        this.isEditing = false;
        
        // Recharger la page pour refléter les changements
        window.location.reload();
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du profil:', error);
        
        this.snackBar.open('Erreur lors de la mise à jour du profil', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        this.isLoading = false;
      }
    });
  }
  
  onSubmitPassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    
    // Première étape : vérifier le mot de passe actuel
    const verifyPasswordData = new FormData();
    verifyPasswordData.append('Id', this.user.id.toString());
    verifyPasswordData.append('CurrentPassword', this.passwordForm.get('currentPassword')?.value);
    
    // Créer un service ou utiliser un service existant pour vérifier le mot de passe actuel
    this.userService.verifyCurrentPassword(this.user.id, this.passwordForm.get('currentPassword')?.value).subscribe({
      next: (isValid) => {
        if (isValid) {
          // Si le mot de passe est valide, procéder au changement
          this.proceedWithPasswordChange();
        } else {
          // Si le mot de passe est invalide, afficher une erreur
          this.snackBar.open('Le mot de passe actuel est incorrect', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du mot de passe:', error);
        this.snackBar.open('Erreur lors de la vérification du mot de passe', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        this.isLoading = false;
      }
    });
  }
  
  // Nouvelle méthode pour procéder au changement de mot de passe
  private proceedWithPasswordChange(): void {
    const formData = new FormData();
    formData.append('Id', this.user.id.toString());
    formData.append('CurrentPassword', this.passwordForm.get('currentPassword')?.value);
    formData.append('Password', this.passwordForm.get('newPassword')?.value);
    
    // Utiliser la méthode appropriée selon le rôle
    let updateObservable;
    
    switch (this.user.role) {
      case 'Stagiaire':
        updateObservable = this.userService.updateStagiaireFormData(this.user.id, formData);
        break;
      case 'Tuteur':
        updateObservable = this.userService.updateTuteurFormData(this.user.id, formData);
        break;
      case 'RHs':
        updateObservable = this.userService.updateRhFormData(this.user.id, formData);
        break;
      default:
        updateObservable = this.userService.updateStagiaireFormData(this.user.id, formData);
    }
    
    updateObservable.subscribe({
      next: (response) => {
        this.snackBar.open('Mot de passe mis à jour avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        this.isLoading = false;
        this.isChangingPassword = false;
        this.passwordForm.reset();
        
        // Recharger la page pour s'assurer que tout est à jour
        window.location.reload();
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        
        let errorMessage = 'Erreur lors de la mise à jour du mot de passe';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        this.snackBar.open(errorMessage, 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        this.isLoading = false;
      }
    });
  }
  
  getImageUrl(relativeUrl: string): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${environment.apiUrl}/${relativeUrl.replace(/^\//, '')}`;
  }
  
  getDepartmentName(departmentId: number | null): string {
    if (!departmentId) return 'Non assigné';
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.departmentName : 'Non assigné';
  }
  
  getTuteurName(tuteurId: number | null): string {
    if (!tuteurId) return 'Non assigné';
    const tuteur = this.tuteurs.find(t => t.id === tuteurId);
    return tuteur ? `${tuteur.firstName} ${tuteur.lastName}` : 'Non assigné';
  }
  
  getUniversityName(universityId: number | null): string {
    if (!universityId) return 'Non assignée';
    const university = this.universities.find(u => u.id === universityId);
    return university ? university.universityname : 'Non assignée';
  }

  getRoleName(roleValue: any): string {
    // Si le rôle est déjà une chaîne, le retourner directement
    if (typeof roleValue === 'string') {
      return roleValue;
    }
    
    // Sinon, convertir la valeur numérique en nom de rôle
    switch (Number(roleValue)) {
      case 0:
        return 'Admin';
      case 1:
        return 'RHs';
      case 2:
        return 'Tuteur';
      case 3:
        return 'Stagiaire';
      default:
        return 'Utilisateur';
    }
  }

  // Chargement du projet assigné au stagiaire
  loadProjetDuStagiaire(stagiaireId: number): void {
    this.loadingProjets = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        // Chercher un projet où le stagiaire est dans la liste des utilisateurs
        const assignedProject = projects.find(project => 
          project.users && 
          project.users.some((user: any) => user.id === stagiaireId || user.userId === stagiaireId)
        );
        
        if (assignedProject) {
          this.projetDuStagiaire = {
            ...assignedProject,
            progress: this.calculateProjectProgress(assignedProject)
          };
        } else {
          this.projetDuStagiaire = null;
        }
        this.loadingProjets = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des projets:', err);
        this.loadingProjets = false;
        this.projetDuStagiaire = null;
      }
    });
  }
  
  // Calculer la progression d'un projet
  calculateProjectProgress(project: any): number {
    if (!project || !project.sprints || project.sprints.length === 0) {
      return 0;
    }
    
    const totalSprints = project.sprints.length;
    const completedSprints = project.sprints.filter((sprint: any) => {
      if (typeof sprint.status === 'string') {
        return sprint.status.toLowerCase() === 'done' || 
               sprint.status.toLowerCase() === 'completed';
      }
      return false;
    }).length;
    
    return Math.round((completedSprints / totalSprints) * 100);
  }
  
  // Gestion des erreurs d'image
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/default-profile.jpg';
  }

  // Nouvelles méthodes utilitaires pour Skills et CV
  
  /**
   * Vérifie si l'utilisateur peut avoir des compétences et un CV
   */
  canUserHaveSkillsAndCv(): boolean {
    return this.userService.canHaveSkillsAndCv(this.currentRole);
  }

  /**
   * Obtient la couleur du chip selon le type de compétence
   */
  getSkillChipColor(skill: string): string {
    const skillLower = skill.toLowerCase();
    
    if (skillLower.includes('java') || skillLower.includes('spring') || skillLower.includes('python')) {
      return 'primary';
    } else if (skillLower.includes('angular') || skillLower.includes('react') || skillLower.includes('vue')) {
      return 'accent';
    } else if (skillLower.includes('sql') || skillLower.includes('database') || skillLower.includes('mysql')) {
      return 'warn';
    } else {
      return '';
    }
  }

  /**
   * Formate la date d'upload du CV
   */
  formatCvUploadDate(date: string): string {
    if (!date) return '';
    
    const uploadDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - uploadDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Uploadé hier';
    } else if (diffDays < 7) {
      return `Uploadé il y a ${diffDays} jours`;
    } else {
      return `Uploadé le ${uploadDate.toLocaleDateString('fr-FR')}`;
    }
  }

  /**
   * Obtient l'icône du fichier selon l'extension
   */
  getCvFileIcon(fileName: string): string {
    if (!fileName) return 'description';
    
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Déclenche le sélecteur de fichier CV
   */
  triggerCvFileInput(): void {
    const fileInput = document.getElementById('cv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Ajoute une compétence depuis le champ de saisie
   */
  addSkillFromInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const skill = input.value.trim();
    
    if (skill && event.key === 'Enter') {
      this.addSkill(skill);
      input.value = '';
    }
  }

  /**
   * Valide et nettoie les compétences
   */
  validateAndCleanSkills(skillsString: string): string {
    return skillsString
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0)
      .filter((skill, index, array) => array.indexOf(skill) === index) // Supprimer les doublons
      .join(', ');
  }

  /**
   * Gère la perte de focus du champ compétences
   */
  onSkillsBlur(): void {
    const skillsValue = this.skillsForm.get('skills')?.value;
    if (skillsValue) {
      const cleanedSkills = this.validateAndCleanSkills(skillsValue);
      this.skillsForm.patchValue({ skills: cleanedSkills });
      this.userSkills = this.userService.formatSkills(cleanedSkills);
    }
  }
  /**
 * Vérifie si l'utilisateur est un tuteur
 */
  get isTuteur(): boolean {
    return this._isTuteur;
  }

/**
 * Vérifie si l'utilisateur peut voir la section stagiaires
 */
 get canViewStagiairesSection(): boolean {
    return this._isTuteur && !this.isEditing && !this.isChangingPassword;
  }
    hasTuteurAccess(): boolean {
    const adminRoles = [ 'Tuteur'];
    return this.currentUser && adminRoles.includes(this.currentUser.role);
  }
}