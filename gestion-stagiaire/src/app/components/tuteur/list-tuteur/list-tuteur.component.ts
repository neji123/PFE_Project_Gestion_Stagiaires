import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { DepartmentService } from '../../../services/Department/department.service';
import { User, UserRole, Department } from '../../models/user';
import { environment } from '../../../environments/environment';
import { AddTuteurComponent } from '../add-tuteur/add-tuteur.component';
import { AuthService } from '../../../Auth/auth-service.service';


interface TuteurPerson {
  id: number;
  name: string;
  speciality: string;
  email: string;
  phone: string;
  imageUrl: string;
  isFavorite: boolean;
  // Informations utilisateur complètes
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  yearsExperience?: number;
  department?: Department;
  departmentId?: number;
  departmentName?: string;
  stagiaireCount?: number;
  // Propriété pour le statut
  statuts?: boolean;  // Actif/Inactif
  startDate?: Date | null;  // Date de début (ajout du type null)
  // Propriétés d'UI
  highlighted?: boolean;
  stagiaires?: []; 
}


@Component({
  selector: 'app-list-tuteur',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    SidebarComponent,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './list-tuteur.component.html',
  styleUrls: ['./list-tuteur.component.scss']
})
export class ListTuteurComponent implements OnInit {
  isSidebarVisible = true;
  searchText = '';
  tuteurList: TuteurPerson[] = [];
  filteredTuteurList: TuteurPerson[] = [];
  isLoading = false;
  
  // Filtres et tri
  activeDepartment: 'all' | number = 'all';
  sortOption = 'nameAsc';
  showOnlyFavorites = false;
  showOnlyActive = false; // Ajout de la propriété manquante
  
  // Pagination
  page = 1;
  pageSize = 6;
  totalTuteurs = 0;
  
  // Mode d'affichage
  viewMode: 'grid' | 'list' = 'grid';
  
  // Liste des départements
  departments: Department[] = [];

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private userService: UserService,
    private departmentService: DepartmentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadTuteurs();
  }
  
  // Charger les départements depuis le service
  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des départements:', error);
        // Départements par défaut en cas d'erreur
        this.departments = [
          { id: 1, departmentName: 'IT' },
          { id: 2, departmentName: 'Finance' },
          { id: 3, departmentName: 'Comptabilité' }
        ];
      }
    });
  }
  
  // Pagination et filtrage
  onPageChange(page: number): void {
    this.page = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  get displayedTuteurs(): TuteurPerson[] {
    const startIndex = (this.page - 1) * this.pageSize;
    return this.filteredTuteurList.slice(startIndex, startIndex + this.pageSize);
  }
  
  getTotalPages(): number {
    return Math.ceil(this.totalTuteurs / this.pageSize);
  }
  
  getPaginationRange(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.page;
    const paginationArray: number[] = [];
    
    if (totalPages <= 7) {
      // Si moins de 7 pages, affichez-les toutes
      for (let i = 1; i <= totalPages; i++) {
        paginationArray.push(i);
      }
    } else {
      // Toujours afficher la première page
      paginationArray.push(1);
      
      // Décider quelles pages du milieu afficher
      if (currentPage <= 3) {
        // Près du début
        paginationArray.push(2, 3, 4, 5, -1);
      } else if (currentPage >= totalPages - 2) {
        // Près de la fin
        paginationArray.push(-1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        // Au milieu
        paginationArray.push(-1, currentPage - 1, currentPage, currentPage + 1, -1);
      }
      
      // Toujours afficher la dernière page
      paginationArray.push(totalPages);
    }
    
    return paginationArray;
  }
  
  // Change le mode d'affichage (grille/liste)
  changeViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }
  
  // Obtenir la liste des départements 
  getDepartments(): Department[] {
    return this.departments;
  }
  
  // Méthode pour obtenir le nom du département à partir de l'ID
  getDepartmentName(departmentId?: number): string {
    if (!departmentId) return 'Non assigné';
    
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.departmentName : 'Non assigné';
  }
  
  // Applique les filtres et le tri
  applyFilters(): void {
    // Commencer avec tous les tuteurs
    let filtered = [...this.tuteurList];
    
    // Filtre par texte de recherche
    if (this.searchText) {
      const lowerCaseSearch = this.searchText.toLowerCase();
      filtered = filtered.filter(tuteur => 
        tuteur.name.toLowerCase().includes(lowerCaseSearch) ||
        tuteur.speciality.toLowerCase().includes(lowerCaseSearch) ||
        tuteur.email.toLowerCase().includes(lowerCaseSearch) ||
        (tuteur.username && tuteur.username.toLowerCase().includes(lowerCaseSearch)) ||
        (tuteur.departmentName && tuteur.departmentName.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Filtre par département
    if (this.activeDepartment !== 'all') {
      filtered = filtered.filter(tuteur => tuteur.departmentId === this.activeDepartment);
    }
    
    // Filtre par favoris
    if (this.showOnlyFavorites) {
      filtered = filtered.filter(tuteur => tuteur.isFavorite);
    }
    
    // Filtre par statut actif
    if (this.showOnlyActive) {
      filtered = filtered.filter(tuteur => tuteur.statuts === true);
    }
    
    // Application du tri
    filtered.sort((a, b) => {
      switch (this.sortOption) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'expDesc':
          const expA = a.yearsExperience || 0;
          const expB = b.yearsExperience || 0;
          return expB - expA;
        case 'expAsc':
          const expAsc = a.yearsExperience || 0;
          const expBsc = b.yearsExperience || 0;
          return expAsc - expBsc;
        case 'stagiaireCount':
          const countA = a.stagiaireCount || 0;
          const countB = b.stagiaireCount || 0;
          return countB - countA;
        case 'startDate':
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        default:
          return 0;
      }
    });
    
    this.filteredTuteurList = filtered;
    this.totalTuteurs = filtered.length;
    
    // Réinitialiser la page si nécessaire
    if (this.page > Math.ceil(this.totalTuteurs / this.pageSize)) {
      this.page = 1;
    }
  }
  
  // Réinitialise tous les filtres
  resetFilters(): void {
    this.searchText = '';
    this.activeDepartment = 'all';
    this.sortOption = 'nameAsc';
    this.showOnlyFavorites = false;
    this.showOnlyActive = false; // Réinitialiser ce filtre aussi
    this.applyFilters();
  }
  
  // Bascule l'affichage des favoris uniquement
  toggleShowFavorites(): void {
    this.showOnlyFavorites = !this.showOnlyFavorites;
    this.applyFilters();
  }
  
  // Bascule l'affichage des tuteurs actifs uniquement
  toggleShowActive(): void {
    this.showOnlyActive = !this.showOnlyActive;
    this.applyFilters();
  }
  
  // Focus sur un tuteur (navigation entre cartes)
  focusTuteur(index: number): void {
    // Mise en évidence visuelle
    const currentTuteurs = [...this.displayedTuteurs];
    currentTuteurs.forEach((t, i) => {
      t.highlighted = i === index;
    });
    
    // Défilement vers le tuteur
    const tuteurCards = document.querySelectorAll(this.viewMode === 'grid' ? '.tuteur-card' : '.tuteur-list-item');
    if (tuteurCards[index]) {
      tuteurCards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Réinitialiser après l'animation
    setTimeout(() => {
      currentTuteurs.forEach(t => {
        t.highlighted = false;
      });
    }, 1000);
  }
  
  // Calcule la largeur de la barre d'expérience (max 20 ans = 100%)
  getExperienceWidth(years: number = 0): number {
    const maxYears = 20; // 20 ans d'expérience = 100%
    return Math.min(100, (years / maxYears) * 100);
  }
  
  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
  
  contactTuteur(tuteur: TuteurPerson): void {
    window.location.href = `mailto:${tuteur.email}`;
  }
  
  // Méthode pour éditer un tuteur
  editTuteur(tuteur: TuteurPerson, event: MouseEvent): void {
    // Empêcher la propagation pour éviter la navigation vers la page de détail
    event.stopPropagation();
    
    // Récupérer les détails complets de l'utilisateur
    this.userService.getTuteurById(tuteur.id).subscribe({
      next: (user: any) => {
        this.openEditTuteurModal(user);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des détails du tuteur:', error);
        // Fallback: utiliser les données disponibles
        const fallbackData = {
          id: tuteur.id,
          username: tuteur.username || '',
          email: tuteur.email,
          firstName: tuteur.firstName || tuteur.name.split(' ')[0] || '',
          lastName: tuteur.lastName || tuteur.name.split(' ').slice(1).join(' ') || '',
          phoneNumber: tuteur.phoneNumber || tuteur.phone,
          role: 'Tuteur',
          speciality: tuteur.speciality,
          yearsExperience: tuteur.yearsExperience || 0,
          departmentId: tuteur.departmentId,
          statuts: tuteur.statuts, // Ajouter le statut
          startDate: tuteur.startDate // Ajouter la date de début
        };
        this.openEditTuteurModal(fallbackData);
      }
    });
  }
  
  // Méthode pour ouvrir la modal en mode édition
  openEditTuteurModal(userData: any): void {
    const dialogRef = this.dialog.open(AddTuteurComponent, {
      width: '800px',
      disableClose: true,
      data: {
        isEditMode: true,
        user: userData
      }
    });
    
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Journaliser les données reçues du formulaire pour le débogage
        console.log('Données reçues du formulaire:', result);
        
        // Créer un FormData pour l'envoi
        const formData = new FormData();
        
        // Ajouter l'ID
        formData.append('Id', userData.id.toString());
        
        // Ajouter les champs de base seulement s'ils sont fournis
        if (result.username) formData.append('Username', result.username);
        if (result.email) formData.append('Email', result.email);
        if (result.firstName) formData.append('FirstName', result.firstName);
        if (result.lastName) formData.append('LastName', result.lastName);
        if (result.phoneNumber !== undefined) formData.append('PhoneNumber', result.phoneNumber);
        
        // Toujours inclure le rôle
        formData.append('Role', 'Tuteur');
        
        // Ajouter les champs spécifiques aux tuteurs
        if (result.speciality !== undefined) formData.append('Speciality', result.speciality);
        if (result.yearsExperience !== undefined) formData.append('YearsExperience', result.yearsExperience.toString());
        
        // Ajouter le statut
        if (result.statuts !== undefined) {
          formData.append('Statuts', result.statuts === true ? 'true' : 'false');
        }
        
        // Ajouter la date de début
        if (result.startDate) {
          formData.append('StartDate', typeof result.startDate === 'string' ? 
            result.startDate : new Date(result.startDate).toISOString());
        }
        
        // Ajouter le département si fourni
        if (result.departmentId !== undefined) {
          formData.append('DepartmentId', result.departmentId ? result.departmentId.toString() : '');
        }
        
        // Ajouter le mot de passe seulement s'il est fourni
        if (result.password && result.password.trim() !== '') {
          formData.append('Password', result.password);
        }
        
        // Ajouter l'image seulement si elle est fournie
        if (result.profilePicture) {
          formData.append('ProfilePicture', result.profilePicture);
        }
        
        // Journaliser les données à envoyer pour le débogage (sans les fichiers pour lisibilité)
        const formDataEntries: Array<string> = [];
        formData.forEach((value, key) => {
          formDataEntries.push(`${key}: ${value instanceof File ? value.name : value}`);
        });
        console.log('Données à envoyer à l\'API:', formDataEntries);
        
        // Ajouter un nouveau service pour les tuteurs dans UserService
        this.userService.updateTuteurFormData(userData.id, formData).subscribe({
          next: (response: any) => {
            console.log('Réponse du serveur:', response);
            
            this.snackBar.open('Tuteur mis à jour avec succès', 'Fermer', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom'
            });
            this.loadTuteurs();
          },
          error: (error: any) => {
            console.error('Erreur lors de la mise à jour du tuteur:', error);
            
            // Obtenir un message d'erreur plus précis
            let errorMsg = 'Une erreur est survenue';
            if (error.error && typeof error.error === 'object' && error.error.message) {
              errorMsg = error.error.message;
            } else if (error.error && typeof error.error === 'string') {
              errorMsg = error.error;
            } else if (error.message) {
              errorMsg = error.message;
            } else if (error.status) {
              errorMsg = `Erreur ${error.status}: ${error.statusText}`;
            }
            
            this.snackBar.open('Erreur lors de la mise à jour du tuteur: ' + errorMsg, 'Fermer', {
              duration: 5000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom'
            });
          }
        });
      }
    });
  }
  
  loadTuteurs(): void {
    this.isLoading = true;
    
    // Récupérer tous les utilisateurs
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        // Filtrer les utilisateurs Tuteur
        const tuteurUsers = users.filter(user => {
          return this.isTuteurUser(user);
        });
        
        // Mapper les utilisateurs Tuteur vers le format TuteurPerson
        this.tuteurList = tuteurUsers.map(user => {
          // Cast user to any type to avoid TypeScript errors
          const userAny = user as any;
          
          // Déterminer le département
          let departmentName = 'Non assigné';
          let departmentId = null;
          
          if (userAny.department && typeof userAny.department === 'object') {
            departmentId = userAny.department.id;
            departmentName = userAny.department.departmentName;
          } else if (userAny.departmentId) {
            departmentId = userAny.departmentId;
            departmentName = this.getDepartmentName(departmentId);
          }
          
          // Traiter la date de début
          let startDate: Date | null = null;
          if (userAny.startDate) {
            startDate = new Date(userAny.startDate);
          }
          
          // Traiter le statut
          const statuts = userAny.statuts !== undefined ? userAny.statuts : true;
          
          const tuteur: TuteurPerson = {
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            speciality: userAny.speciality || 'Général',
            email: user.email,
            phone: userAny.phoneNumber || 'Non renseigné',
            imageUrl: this.getDefaultImageUrl(userAny),
            isFavorite: false,
            // Stocker les informations supplémentaires pour l'édition
            username: userAny.username,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: userAny.phoneNumber,
            role: userAny.role,
            yearsExperience: userAny.yearsExperience || 0,
            departmentId: departmentId,
            departmentName: departmentName,
            stagiaireCount: 0, // Sera mis à jour après
            // Propriété modifiée: statuts au lieu de status
            statuts: statuts,
            startDate: startDate,
            highlighted: false
          };
          
          // Pour chaque tuteur, récupérer la liste de ses stagiaires
          this.userService.getStagiairesByTuteur(user.id).subscribe({
            next: (stagiaires) => {
              if (stagiaires) {
                // Mettre à jour le nombre de stagiaires pour ce tuteur
                tuteur.stagiaireCount = stagiaires.length;
                // Déclencher la détection de changements
                this.applyFilters();
              }
            },
            error: (error) => {
              console.error(`Erreur lors de la récupération des stagiaires pour le tuteur ${user.id}:`, error);
            }
          });
          
          return tuteur;
        });
        
        // Appliquer les filtres
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des tuteurs:', error);
        this.snackBar.open('Erreur lors du chargement des données', 'Fermer', {
          duration: 3000
        });
        this.isLoading = false;
        
        // Charger des données d'exemple en cas d'échec
        this.loadSampleData();
      }
    });
  }

  // Helper method to check if user is a Tuteur
  private isTuteurUser(user: User): boolean {
    const userAny = user as any;
    
    return user.role === UserRole.Tuteur || 
           (typeof userAny.role === 'string' && userAny.role === 'Tuteur') ||
           userAny.roleId === 2 || 
           (typeof userAny.role === 'number' && userAny.role === 2);
  }
  
  // Helper method to get default image URL
  private getDefaultImageUrl(user: any): string {
    if (user.profilePictureUrl) return user.profilePictureUrl;
    if (user.imageUrl) return user.imageUrl;
    return 'assets/images/default-profile.jpg';
  }

  loadSampleData(): void {
    // Données d'exemple enrichies pour les tests
    const sampleData: TuteurPerson[] = [
      {
        id: 1,
        name: 'Jean Dupont',
        speciality: 'Développement Logiciel',
        email: 'jean.dupont@example.com',
        phone: '+33 123 456 789',
        imageUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
        isFavorite: false,
        username: 'jdupont',
        firstName: 'Jean',
        lastName: 'Dupont',
        phoneNumber: '+33 123 456 789',
        role: 'Tuteur',
        yearsExperience: 8,
        departmentId: 1,
        departmentName: 'IT',
        stagiaireCount: 3,
        statuts: true,
        startDate: new Date('2016-05-15'),
        highlighted: false
      },
      {
        id: 2,
        name: 'Sophie Martin',
        speciality: 'Design UX/UI',
        email: 'sophie.martin@example.com',
        phone: '+33 987 654 321',
        imageUrl: 'https://randomuser.me/api/portraits/women/67.jpg',
        isFavorite: true,
        username: 'smartin',
        firstName: 'Sophie',
        lastName: 'Martin',
        phoneNumber: '+33 987 654 321',
        role: 'Tuteur',
        yearsExperience: 5,
        departmentId: 2,
        departmentName: 'Finance',
        stagiaireCount: 2,
        statuts: true,
        startDate: new Date('2019-03-10'),
        highlighted: false
      },
      {
        id: 3,
        name: 'Marc Lefebvre',
        speciality: 'Finance et Comptabilité',
        email: 'marc.lefebvre@example.com',
        phone: '+33 654 321 987',
        imageUrl: 'https://randomuser.me/api/portraits/men/42.jpg',
        isFavorite: false,
        username: 'mlefebvre',
        firstName: 'Marc',
        lastName: 'Lefebvre',
        phoneNumber: '+33 654 321 987',
        role: 'Tuteur',
        yearsExperience: 12,
        departmentId: 2,
        departmentName: 'Finance',
        stagiaireCount: 5,
        statuts: false,
        startDate: new Date('2012-09-01'),
        highlighted: false
      },
      {
        id: 4,
        name: 'Claire Dubois',
        speciality: 'Marketing Digital',
        email: 'claire.dubois@example.com',
        phone: '+33 456 789 123',
        imageUrl: 'https://randomuser.me/api/portraits/women/33.jpg',
        isFavorite: true,
        username: 'cdubois',
        firstName: 'Claire',
        lastName: 'Dubois',
        phoneNumber: '+33 456 789 123',
        role: 'Tuteur',
        yearsExperience: 7,
        departmentId: 1,
        departmentName: 'IT',
        stagiaireCount: 4,
        statuts: true,
        startDate: new Date('2018-01-20'),
        highlighted: false
      }
    ];
    
    this.tuteurList = sampleData;
    
    // Appliquer les filtres sur les données d'exemple
    this.applyFilters();
  }

  toggleFavorite(tuteur: TuteurPerson): void {
    // Pour l'instant, mise à jour locale uniquement
    tuteur.isFavorite = !tuteur.isFavorite;
    
    const message = tuteur.isFavorite 
      ? `${tuteur.name} ajouté aux favoris`
      : `${tuteur.name} retiré des favoris`;
    
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
    
    // Si on affiche uniquement les favoris, réappliquer les filtres
    if (this.showOnlyFavorites) {
      this.applyFilters();
    }
  }

  openAddTuteurModal(): void {
    const dialogRef = this.dialog.open(AddTuteurComponent, {
      width: '800px',
      disableClose: true,
      data: { isEditMode: false }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Récupérer tous les champs du formulaire
        console.log('Résultat du formulaire:', result);
        
        // Créer un FormData pour l'envoi
        const formData = new FormData();
        
        // IMPORTANT: Utiliser EXACTEMENT les mêmes noms de champs que ceux utilisés 
        // lors de l'ajout réussi d'un stagiaire
        formData.append('Username', result.username);
        formData.append('Email', result.email);
        formData.append('Password', result.password);
        formData.append('ConfirmPassword', result.confirmPassword);
        formData.append('FirstName', result.firstName);
        formData.append('LastName', result.lastName);
        formData.append('PhoneNumber', result.phoneNumber || '');
        formData.append('Role', 'Tuteur');
        
        // Champs spécifiques pour le tuteur avec des valeurs par défaut sûres
        formData.append('YearsExperience', result.yearsExperience?.toString() || '0');
        
        // IMPORTANT: Envoyer le statut (utiliser le nom correct: statuts vs status selon l'API)
        formData.append('Statuts', result.statuts === true ? 'true' : 'false');
        formData.append('status', result.status === true ? 'true' : 'false');
        
        // Département
        formData.append('DepartmentId', result.departmentId?.toString() || '1');
        
        // Champs obligatoires pour les stagiaires (vides pour les tuteurs)
        formData.append('TuteurId', '');
        formData.append('TuteurName', '');
        formData.append('UniversityId', '');
        if (result.startDate) {
          formData.append('StartDate', typeof result.startDate === 'string' ? 
            result.startDate : new Date(result.startDate).toISOString());
        } else {
          formData.append('StartDate', '');
        }
        formData.append('EndDate', '');
        formData.append('Stage', '');
  
        formData.append('Etudiant', '');
    
        
        // Essayons d'ajouter tous les champs possibles
        formData.append('Note', '');
        
        // Photo de profil
        if (result.profilePicture) {
          formData.append('ProfilePicture', result.profilePicture);
        }
        
       // Débogage approfondi
       const formDataEntries: Array<string> = [];
       formData.forEach((value, key) => {
         formDataEntries.push(`${key}: ${value instanceof File ? value.name : value}`);
       });
       console.log('FormData complet envoyé:', formDataEntries);
       
       // Envoi avec plus de détails sur l'erreur
       this.authService.registerWithFormData(formData).subscribe({
         next: (response) => {
           console.log('Réponse d\'ajout réussie:', response);
           this.snackBar.open('Tuteur ajouté avec succès', 'Fermer', {
             duration: 3000,
             horizontalPosition: 'end',
             verticalPosition: 'bottom'
           });
           this.loadTuteurs();
         },
         error: (error) => {
           console.error('Erreur lors de l\'ajout du tuteur:', error);
           
           // Afficher toutes les propriétés de l'erreur
           console.error('Propriétés complètes de l\'erreur:', Object.keys(error));
           
           if (error.error) {
             console.error('Contenu de error.error:', error.error);
             
             // Si error.error est un objet, afficher ses propriétés
             if (typeof error.error === 'object') {
               console.error('Propriétés de error.error:', Object.keys(error.error));
             }
           }
           
           if (error.message) {
             console.error('Message d\'erreur:', error.message);
           }
           
           this.snackBar.open('Erreur lors de l\'ajout du tuteur. Veuillez vérifier les logs', 'Fermer', {
             duration: 5000,
             horizontalPosition: 'end',
             verticalPosition: 'bottom'
           });
         }
       });
     }
   });
 }

 getImageUrl(relativeUrl: string | null): string {
   if (!relativeUrl) return 'assets/images/default-profile.jpg';
   
   // Si c'est déjà une URL complète, retournez-la telle quelle
   if (relativeUrl.startsWith('http')) return relativeUrl;
   
   // Sinon, préfixez avec l'URL du backend
   return `${environment.apiUrl}${relativeUrl}`;
 }

 confirmDelete(tuteur: TuteurPerson): void {
   // Utiliser la confirmation native du navigateur
   const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer le tuteur ${tuteur.name} ?`);
   
   if (confirmed) {
     this.deleteTuteur(tuteur);
   }
 }
 
 /**
  * Supprime un tuteur et met à jour la liste
  */
 deleteTuteur(tuteur: TuteurPerson): void {
   this.isLoading = true;
   
   this.userService.deleteUser(tuteur.id).subscribe({
     next: () => {
       this.snackBar.open(`${tuteur.name} a été supprimé avec succès`, 'Fermer', {
         duration: 3000,
         horizontalPosition: 'end',
         verticalPosition: 'bottom'
       });
       
       // Mettre à jour la liste des tuteurs
       this.loadTuteurs();
     },
     error: (error) => {
       console.error('Erreur lors de la suppression du tuteur:', error);
       this.snackBar.open('Erreur lors de la suppression du tuteur', 'Fermer', {
         duration: 3000,
         horizontalPosition: 'end',
         verticalPosition: 'bottom'
       });
       
       this.isLoading = false;
     }
   });
 }

 toggleStatus(tuteur: TuteurPerson): void {
  // Nouveau statut (inversé)
  const newStatus = !tuteur.statuts;
  
  // Préparation des données à envoyer
  const formData = new FormData();
  formData.append('Id', tuteur.id.toString());
  formData.append('Statuts', newStatus ? 'true' : 'false');
  
  // Mise à jour du statut via l'API
  this.userService.updateTuteurFormData(tuteur.id, formData).subscribe({
    next: (response) => {
      // Mettre à jour le tuteur dans la liste locale
      tuteur.statuts = newStatus;
      
      this.snackBar.open(
        `Statut de ${tuteur.name} modifié : ${newStatus ? 'Actif' : 'Inactif'}`, 
        'Fermer', 
        {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        }
      );
    },
    error: (error) => {
      console.error('Erreur lors de la mise à jour du statut:', error);
      this.snackBar.open(
        'Erreur lors de la modification du statut', 
        'Fermer', 
        {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        }
      );
    }
  });
}
}