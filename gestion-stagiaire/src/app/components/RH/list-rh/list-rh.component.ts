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
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { User, UserRole, RH, Department } from '../../models/user';
import { environment } from '../../../environments/environment';
import { AddRhModalComponent } from '../add-rh/add-rh.component';
import { AuthService } from '../../../Auth/auth-service.service';
import { DepartmentService } from '../../../services/Department/department.service';

interface RhPerson {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  imageUrl: string;
  isFavorite: boolean;
  // Stockage des informations complètes
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  department?: Department;
  departmentId?: number;
  departmentName?: string;
  // Nouveaux champs ajoutés
  yearsExperience?: number;
  statuts?: boolean;
  startDate?: Date | null;
  // Animation et UI
  highlighted?: boolean;
}

@Component({
  selector: 'app-list-rh',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    SidebarComponent,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatSelectModule,
    MatPaginatorModule
  ],
  templateUrl: './list-rh.component.html',
  styleUrls: ['./list-rh.component.scss']
})
export class ListRHComponent implements OnInit {
  isSidebarVisible = true;
  searchText = '';
  rhList: RhPerson[] = [];
  filteredRhList: RhPerson[] = [];
  isLoading = false;
  
  // Pagination
  pageSize = 6;
  pageSizeOptions: number[] = [6, 12, 24, 48];
  pageIndex = 0;
  totalRhs = 0;
  
  // Tri et filtres
  sortOption: string = 'nameAsc';
  departmentFilter: 'all' | number = 'all';
  viewMode: 'grid' | 'list' = 'grid';
  showOnlyFavorites: boolean = false;
  showOnlyActive: boolean = false; // Nouveau filtre pour les RH actifs
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
    this.loadRHs();
  }

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
  
  // Pagination event handler
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
  
  // Obtenir les RHs à afficher sur la page courante
  get displayedRhs(): RhPerson[] {
    const startIndex = this.pageIndex * this.pageSize;
    return this.filteredRhList.slice(startIndex, startIndex + this.pageSize);
  }
  
  applyFilters(): void {
    let filtered = [...this.rhList];
    
    // Filtre par texte
    if (this.searchText) {
      const lowerCaseSearch = this.searchText.toLowerCase();
      filtered = filtered.filter(rh => 
        rh.name.toLowerCase().includes(lowerCaseSearch) ||
        rh.position.toLowerCase().includes(lowerCaseSearch) ||
        rh.email.toLowerCase().includes(lowerCaseSearch) ||
        rh.phone.toLowerCase().includes(lowerCaseSearch) ||
        (rh.username && rh.username.toLowerCase().includes(lowerCaseSearch)) ||
        (rh.departmentName && rh.departmentName.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    // Filtre par département
    if (this.departmentFilter !== 'all') {
      filtered = filtered.filter(rh => rh.departmentId === this.departmentFilter);
    }
    
    // Filtre par favoris
    if (this.showOnlyFavorites) {
      filtered = filtered.filter(rh => rh.isFavorite);
    }
    
    // Filtre par statut actif
    if (this.showOnlyActive) {
      filtered = filtered.filter(rh => rh.statuts === true);
    }
    
    // Tri
    filtered.sort((a, b) => {
      switch (this.sortOption) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'startDate':
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        case 'newest':
          return b.id - a.id;
        default:
          return 0;
      }
    });
    
    this.filteredRhList = filtered;
    this.totalRhs = filtered.length;
    
    // Réinitialiser la pagination si nécessaire
    if (this.pageIndex * this.pageSize >= this.totalRhs) {
      this.pageIndex = 0;
    }
  }
  
  resetFilters(): void {
    this.searchText = '';
    this.departmentFilter = 'all';
    this.sortOption = 'nameAsc';
    this.showOnlyFavorites = false;
    this.showOnlyActive = false; // Réinitialiser ce filtre aussi
    this.applyFilters();
  }
  
  // Bascule l'affichage des RH actifs uniquement
  toggleShowActive(): void {
    this.showOnlyActive = !this.showOnlyActive;
    this.applyFilters();
  }
  
  changeViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }
  
  getDepartments(): Department[] {
    return this.departments;
  }
  
  getDepartmentName(departmentId?: number): string {
    if (!departmentId) return 'Non assigné';
    
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.departmentName : 'Non assigné';
  }
  
  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
  
  contactRh(rh: RhPerson): void {
    window.location.href = `mailto:${rh.email}`;
  }
  
  editRh(rh: RhPerson, event: MouseEvent): void {
    event.stopPropagation();
    
    this.userService.getRhById(rh.id).subscribe({
      next: (user: any) => {
        this.openEditRhModal(user);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des détails du RH:', error);
        // Fallback: utiliser les données disponibles
        const fallbackData = {
          id: rh.id,
          username: rh.username || '',
          email: rh.email,
          firstName: rh.firstName || rh.name.split(' ')[0] || '',
          lastName: rh.lastName || rh.name.split(' ').slice(1).join(' ') || '',
          phoneNumber: rh.phoneNumber || rh.phone,
          role: 'RHs',
          department: rh.department,
          departmentId: rh.departmentId,
          yearsExperience: rh.yearsExperience || 0,
          statuts: rh.statuts,
          startDate: rh.startDate
        };
        this.openEditRhModal(fallbackData);
      }
    });
  }
  
  // Navigation entre RHs
  focusRh(index: number): void {
    // Marquer comme mis en évidence pour l'animation
    const currentRhs = [...this.displayedRhs];
    currentRhs.forEach((rh, i) => {
      rh.highlighted = i === index;
    });
    
    // Animation de défilement vers le RH
    const rhCards = document.querySelectorAll(this.viewMode === 'grid' ? '.rh-card' : '.rh-list-item');
    if (rhCards[index]) {
      rhCards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Réinitialiser l'état mis en évidence après un délai
    setTimeout(() => {
      currentRhs.forEach(rh => {
        rh.highlighted = false;
      });
    }, 1000);
  }
  
  // Méthode pour calculer la largeur de la barre d'expérience
  getExperienceWidth(years: number = 0): number {
    const maxYears = 20; // 20 ans d'expérience = 100%
    return Math.min(100, (years / maxYears) * 100);
  }
  
  // Méthode pour changer le statut d'un RH
  toggleStatus(rh: RhPerson): void {
    // Nouveau statut (inversé)
    const newStatus = !rh.statuts;
    
    // Préparation des données à envoyer
    const formData = new FormData();
    formData.append('Id', rh.id.toString());
    formData.append('Statuts', newStatus ? 'true' : 'false');
    
   // Mise à jour du statut via l'API
   this.userService.updateRhFormData(rh.id, formData).subscribe({
    next: (response) => {
      // Mettre à jour le RH dans la liste locale
      rh.statuts = newStatus;
      
      this.snackBar.open(
        `Statut de ${rh.name} modifié : ${newStatus ? 'Actif' : 'Inactif'}`, 
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

// Méthode pour ouvrir la modal en mode édition
openEditRhModal(userData: any): void {
  const dialogRef = this.dialog.open(AddRhModalComponent, {
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
      formData.append('Role', 'RHs');
      
      // Ajouter le département si fourni
      if (result.departmentId !== undefined) {
        formData.append('DepartmentId', result.departmentId ? result.departmentId.toString() : '');
      } else if (result.department) {
        // Si nous avons un nom de département au lieu d'un ID
        formData.append('Department', result.department);
      }
      
      // Ajouter années d'expérience
      if (result.yearsExperience !== undefined) {
        formData.append('YearsExperience', result.yearsExperience.toString());
      }
      
      // Ajouter statut
      if (result.statuts !== undefined) {
        formData.append('Statuts', result.statuts ? 'true' : 'false');
      }
      
      // Ajouter date de début
      if (result.startDate) {
        const startDate = typeof result.startDate === 'string'
          ? result.startDate
          : new Date(result.startDate).toISOString();
        formData.append('StartDate', startDate);
      }
      
      // Ajouter d'autres champs spécifiques aux RH si nécessaire
      if (result.position !== undefined) formData.append('Position', result.position);
      if (result.hireDate !== undefined) {
        const hireDate = typeof result.hireDate === 'string' 
          ? result.hireDate 
          : new Date(result.hireDate).toISOString();
        formData.append('HireDate', hireDate);
      }
      if (result.employeeNumber !== undefined) formData.append('EmployeeNumber', result.employeeNumber);
      
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
      
      // Utiliser le nouveau service pour les RH
      this.userService.updateRhFormData(userData.id, formData).subscribe({
        next: (response: any) => {
          console.log('Réponse du serveur:', response);
          
          this.snackBar.open('RH mis à jour avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
          this.loadRHs();
        },
        error: (error: any) => {
          console.error('Erreur lors de la mise à jour du RH:', error);
          
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
          
          this.snackBar.open('Erreur lors de la mise à jour du RH: ' + errorMsg, 'Fermer', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
        }
      });
    }
  });
}

loadRHs(): void {
  this.isLoading = true;
  
  // Récupérer tous les utilisateurs
  this.userService.getAllUsers().subscribe({
    next: (users) => {
      // Filtrer les utilisateurs RH
      const rhUsers = users.filter(user => this.isRhUser(user));
      
      // Mapper les utilisateurs RH vers le format RhPerson
      this.rhList = rhUsers.map(user => {
        const userAny = user as any;

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
        
        return {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          position: userAny.position || 'Responsable RH',
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
          statuts: statuts,
          startDate: startDate,
          highlighted: false
        };
      });
      
      this.applyFilters();
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Erreur lors du chargement des RHs:', error);
      this.snackBar.open('Erreur lors du chargement des données', 'Fermer', {
        duration: 3000
      });
      this.isLoading = false;
      
      // Charger des données d'exemple en cas d'échec
      this.loadSampleData();
    }
  });
}

// Helper method to check if user is an RH
private isRhUser(user: User): boolean {
  const userAny = user as any;
  
  return user.role === UserRole.RHs || 
         (typeof userAny.role === 'string' && userAny.role === 'RHs') ||
         userAny.roleId === 1 || 
         (typeof userAny.role === 'number' && userAny.role === 1);
}

// Helper method to get default image URL
private getDefaultImageUrl(user: any): string {
  if (user.profilePictureUrl) return user.profilePictureUrl;
  if (user.imageUrl) return user.imageUrl;
  return 'assets/images/default-profile.jpg';
}

loadSampleData(): void {
  // Données d'exemple pour les tests avec des départements variés
  this.rhList = [
    {
      id: 1,
      name: 'Jean Dupont',
      position: 'Directeur RH',
      email: 'jean.dupont@example.com',
      phone: '+33 123 456 789',
      imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      isFavorite: false,
      username: 'jdupont',
      firstName: 'Jean',
      lastName: 'Dupont',
      phoneNumber: '+33 123 456 789',
      role: 'RHs',
      departmentId: 1,
      departmentName: 'IT',
      yearsExperience: 10,
      statuts: true,
      startDate: new Date('2014-05-15')
    },
    {
      id: 2,
      name: 'Sophie Martin',
      position: 'Responsable Recrutement',
      email: 'sophie.martin@example.com',
      phone: '+33 987 654 321',
      imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      isFavorite: true,
      username: 'smartin',
      firstName: 'Sophie',
      lastName: 'Martin',
      phoneNumber: '+33 987 654 321',
      role: 'RHs',
      departmentId: 2,
      departmentName: 'Finance',
      yearsExperience: 7,
      statuts: true,
      startDate: new Date('2017-03-10')
    },
    {
      id: 3,
      name: 'Thomas Lefebvre',
      position: 'Chargé de formation',
      email: 'thomas.lefebvre@example.com',
      phone: '+33 654 789 321',
      imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
      isFavorite: false,
      username: 'tlefebvre',
      firstName: 'Thomas',
      lastName: 'Lefebvre',
      phoneNumber: '+33 654 789 321',
      role: 'RHs',
      departmentId: 3,
      departmentName: 'Comptabilité',
      yearsExperience: 5,
      statuts: false,
      startDate: new Date('2019-09-01')
    },
    {
      id: 4,
      name: 'Marie Dubois',
      position: 'Responsable GPEC',
      email: 'marie.dubois@example.com',
      phone: '+33 789 456 123',
      imageUrl: 'https://randomuser.me/api/portraits/women/58.jpg',
      isFavorite: false,
      username: 'mdubois',
      firstName: 'Marie',
      lastName: 'Dubois',
      phoneNumber: '+33 789 456 123',
      role: 'RHs',
      departmentId: 1,
      departmentName: 'IT',
      yearsExperience: 8,
      statuts: true,
      startDate: new Date('2016-01-20')
    },
    {
      id: 5,
      name: 'Pierre Moreau',
      position: 'Gestionnaire de paie',
      email: 'pierre.moreau@example.com',
      phone: '+33 321 654 987',
      imageUrl: 'https://randomuser.me/api/portraits/men/45.jpg',
      isFavorite: true,
      username: 'pmoreau',
      firstName: 'Pierre',
      lastName: 'Moreau',
      phoneNumber: '+33 321 654 987',
      role: 'RHs',
      departmentId: 2,
      departmentName: 'Finance',
      yearsExperience: 3,
      statuts: true,
      startDate: new Date('2021-06-15')
    },
    {
      id: 6,
      name: 'Julie Bernard',
      position: 'Chargée des relations sociales',
      email: 'julie.bernard@example.com',
      phone: '+33 456 123 789',
      imageUrl: 'https://randomuser.me/api/portraits/women/29.jpg',
      isFavorite: false,
      username: 'jbernard',
      firstName: 'Julie',
      lastName: 'Bernard',
      phoneNumber: '+33 456 123 789',
      role: 'RHs',
      departmentId: 3,
      departmentName: 'Comptabilité',
      yearsExperience: 4,
      statuts: false,
      startDate: new Date('2020-03-01')
    },
    {
      id: 7,
      name: 'Nicolas Petit',
      position: 'Responsable mobilité',
      email: 'nicolas.petit@example.com',
      phone: '+33 123 789 456',
      imageUrl: 'https://randomuser.me/api/portraits/men/67.jpg',
      isFavorite: false,
      username: 'npetit',
      firstName: 'Nicolas',
      lastName: 'Petit',
      phoneNumber: '+33 123 789 456',
      role: 'RHs',
      departmentId: 1,
      departmentName: 'IT',
      yearsExperience: 6,
      statuts: true,
      startDate: new Date('2018-09-10')
    }
  ];
  
  this.applyFilters();
}

toggleFavorite(rh: RhPerson): void {
  // Pour l'instant, mise à jour locale uniquement
  rh.isFavorite = !rh.isFavorite;
  
  const message = rh.isFavorite 
    ? `${rh.name} ajouté aux favoris`
    : `${rh.name} retiré des favoris`;
  
  this.snackBar.open(message, 'Fermer', {
    duration: 3000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom'
  });
  
  // Réappliquer les filtres si on affiche uniquement les favoris
  if (this.showOnlyFavorites) {
    this.applyFilters();
  }
}

toggleShowFavorites(): void {
  this.showOnlyFavorites = !this.showOnlyFavorites;
  this.applyFilters();
}

openAddRhModal(): void {
  const dialogRef = this.dialog.open(AddRhModalComponent, {
    width: '800px',
    disableClose: true,
    data: { isEditMode: false }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // Créer un FormData pour envoyer la même structure que le formulaire d'inscription
      const formData = new FormData();
      
      // Ajouter tous les champs du formulaire
      formData.append('Username', result.username);
      formData.append('Email', result.email);
      formData.append('Password', result.password);
      formData.append('ConfirmPassword', result.confirmPassword);
      formData.append('FirstName', result.firstName);
      formData.append('LastName', result.lastName);
      formData.append('PhoneNumber', result.phoneNumber || '');
      formData.append('Role', 'RHs');

      formData.append('YearsExperience', result.yearsExperience?.toString() || '0');
      formData.append('Statuts', result.statuts === true ? 'true' : 'false');
      formData.append('DepartmentId', result.departmentId?.toString() || '1');

      // Date de début si fournie
      if (result.startDate) {
        formData.append('StartDate', typeof result.startDate === 'string' ? 
          result.startDate : new Date(result.startDate).toISOString());
      } else {
        formData.append('StartDate', '');
      }
         
      // Champs obligatoires pour les stagiaires (vides pour les RH)
      formData.append('TuteurId', '');
      formData.append('TuteurName', '');
      formData.append('UniversityId', '');
      formData.append('EndDate', '');
      formData.append('Stage', '');
      formData.append('Etudiant', '');
      formData.append('Note', '');
         
      // Photo de profil
      if (result.profilePicture) {
        formData.append('ProfilePicture', result.profilePicture);
      }
      
      const formDataEntries: Array<string> = [];
      formData.forEach((value, key) => {
        formDataEntries.push(`${key}: ${value instanceof File ? value.name : value}`);
      });
      console.log('FormData complet envoyé:', formDataEntries);

      // Utiliser le même service que pour l'inscription
      this.authService.registerWithFormData(formData).subscribe({
        next: (response: any) => {
          this.snackBar.open('RH ajouté avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom'
          });
          
          // Recharger la liste des RH
          this.loadRHs();
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du RH:', error);
          
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
          
          this.snackBar.open('Erreur lors de l\'ajout du RH. Veuillez vérifier les logs', 'Fermer', {
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

confirmDelete(rh: RhPerson): void {
  // Utiliser la confirmation native du navigateur
  const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer le RH ${rh.name} ?`);
  
  if (confirmed) {
    this.deleteRh(rh);
  }
}

/**
 * Supprime un RH et met à jour la liste
 */
deleteRh(rh: RhPerson): void {
  this.isLoading = true;
  
  this.userService.deleteUser(rh.id).subscribe({
    next: () => {
      this.snackBar.open(`${rh.name} a été supprimé avec succès`, 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
      
      // Mettre à jour la liste des RH
      this.loadRHs();
    },
    error: (error) => {
      console.error('Erreur lors de la suppression du RH:', error);
      this.snackBar.open('Erreur lors de la suppression du RH', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
      
      this.isLoading = false;
    }
  });
}
}