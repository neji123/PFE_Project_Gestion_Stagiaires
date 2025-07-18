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
import { User, UserRole, Stagiaire, Tuteur, Department } from '../../models/user';
import { environment } from '../../../environments/environment';
import { AddStagiaireComponent } from '../add-stagiaire/add-stagiaire.component';
import { AuthService } from '../../../Auth/auth-service.service';
import { of, forkJoin } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface StagiairePerson {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  imageUrl: string;
  isFavorite: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  tuteurId?: number;
  tuteurName?: string;
  
  statuts?: boolean;
  etudiant?: string;
  stage?:string;
  universityName?:string;
  universityId?: number;
  startDate?: string;
  endDate?: string;
  department?: Department | string;
  departmentId?: number;
  departmentName?: string;
  note?: number;
  highlighted?: boolean;
}

@Component({
  selector: 'app-list-stagiaire',
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
  templateUrl: './list-stagiaire.component.html',
  styleUrls: ['./list-stagiaire.component.scss']
})
export class ListStagiaireComponent implements OnInit {
  isSidebarVisible = true;
  searchText = '';
  stagiaireList: StagiairePerson[] = [];
  filteredStagiaireList: StagiairePerson[] = [];
  isLoading = false;
  
  // Filtres et tri
  // Changement : departmentFilter peut être 'all' ou un nombre (ID du département)
  departmentFilter: 'all' | number = 'all';
  sortOption = 'nameAsc';
  showOnlyFavorites = false;
  
  // Pagination
  page = 1;
  pageSize = 6;
  totalStagiaires = 0;
  
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
    this.loadStagiaires();
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
  
  get displayedStagiaires(): StagiairePerson[] {
    const startIndex = (this.page - 1) * this.pageSize;
    return this.filteredStagiaireList.slice(startIndex, startIndex + this.pageSize);
  }
  
  getTotalPages(): number {
    return Math.ceil(this.totalStagiaires / this.pageSize);
  }
  
  getPaginationRange(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.page;
    const paginationArray: number[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        paginationArray.push(i);
      }
    } else {
      paginationArray.push(1);
      
      if (currentPage <= 3) {
        paginationArray.push(2, 3, 4, 5, -1);
      } else if (currentPage >= totalPages - 2) {
        paginationArray.push(-1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        paginationArray.push(-1, currentPage - 1, currentPage, currentPage + 1, -1);
      }
      
      paginationArray.push(totalPages);
    }
    
    return paginationArray;
  }
  
  changeViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }
  
  applyFilters(): void {
    let filtered = [...this.stagiaireList];
  
    if (this.searchText) {
      const lowerCaseSearch = this.searchText.toLowerCase();
      filtered = filtered.filter(stagiaire =>
        stagiaire.name.toLowerCase().includes(lowerCaseSearch) ||
        stagiaire.position.toLowerCase().includes(lowerCaseSearch) ||
        stagiaire.email.toLowerCase().includes(lowerCaseSearch) ||
        (stagiaire.departmentName && stagiaire.departmentName.toLowerCase().includes(lowerCaseSearch)) ||
        (stagiaire.tuteurName && stagiaire.tuteurName.toLowerCase().includes(lowerCaseSearch))
      );
    }
  
    if (this.departmentFilter !== 'all') {
      console.log('Filtering by department:', this.departmentFilter);
      filtered = filtered.filter(stagiaire => {
        // Filtrage par ID du département
        return stagiaire.departmentId === this.departmentFilter;
      });
    }
  
    if (this.showOnlyFavorites) {
      filtered = filtered.filter(stagiaire => stagiaire.isFavorite);
    }
  
    filtered.sort((a, b) => {
      switch (this.sortOption) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'dateDesc':
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        case 'dateAsc':
          const dateAsc = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateBsc = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateAsc - dateBsc;
        case 'ratingDesc':
          const ratingA = a.note || 0;
          const ratingB = b.note || 0;
          return ratingB - ratingA;
        default:
          return 0;
      }
    });
  
    this.filteredStagiaireList = filtered;
    this.totalStagiaires = filtered.length;
  
    if (this.page > Math.ceil(this.totalStagiaires / this.pageSize)) {
      this.page = 1;
    }
  }
  
  resetFilters(): void {
    this.searchText = '';
    this.departmentFilter = 'all';
    this.sortOption = 'nameAsc';
    this.showOnlyFavorites = false;
    this.applyFilters();
  }
  
  toggleShowFavorites(): void {
    this.showOnlyFavorites = !this.showOnlyFavorites;
    this.applyFilters();
  }
  
  focusStagiaire(index: number): void {
    const currentStagiaires = [...this.displayedStagiaires];
    currentStagiaires.forEach((s, i) => {
      s.highlighted = i === index;
    });
    
    const stagiaireCards = document.querySelectorAll(this.viewMode === 'grid' ? '.stagiaire-card' : '.stagiaire-list-item');
    if (stagiaireCards[index]) {
      stagiaireCards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    setTimeout(() => {
      currentStagiaires.forEach(s => {
        s.highlighted = false;
      });
    }, 1000);
  }
  
  isActiveStagiaire(stagiaire: StagiairePerson): boolean {
    if (!stagiaire.startDate) return false;
    
    const now = new Date();
    const startDate = new Date(stagiaire.startDate);
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : undefined;
    
    return startDate <= now && (!endDate || endDate >= now);
  }
  
  getProgressPercentage(stagiaire: StagiairePerson): number {
    if (!stagiaire.startDate) return 0;
    
    const now = new Date();
    const startDate = new Date(stagiaire.startDate);
    const endDate = stagiaire.endDate ? new Date(stagiaire.endDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (now < startDate) return 0;
    if (now > endDate) return 100;
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    
    return Math.min(100, Math.max(0, Math.round((elapsedDuration / totalDuration) * 100)));
  }
  
  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
  
  contactStagiaire(stagiaire: StagiairePerson): void {
    window.location.href = `mailto:${stagiaire.email}`;
  }
  
  getDepartements(): Department[] {
    // Retourne tous les départements chargés depuis le service
    return this.departments;
  }
  
  // Méthode pour obtenir le nom du département à partir de l'objet département ou de l'ID
  getDepartmentName(departmentId?: number): string {
    if (!departmentId) return 'Non assigné';
    
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.departmentName : 'Non assigné';
  }
  
  // Méthode pour obtenir l'ID du département à partir du nom
  getDepartmentId(departmentName?: string): number | null {
    if (!departmentName) return null;
    
    const department = this.departments.find(d => d.departmentName === departmentName);
    return department ? department.id : null;
  }
  
  editStagiaire(stagiaire: StagiairePerson, event: MouseEvent): void {
    event.stopPropagation();
    
    this.userService.getStagiaireById(stagiaire.id).subscribe({
      next: (user: any) => {
        this.openEditStagiaireModal(user);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des détails du stagiaire:', error);
        const fallbackData = {
          id: stagiaire.id,
          username: stagiaire.username || '',
          email: stagiaire.email,
          firstName: stagiaire.firstName || stagiaire.name.split(' ')[0] || '',
          lastName: stagiaire.lastName || stagiaire.name.split(' ').slice(1).join(' ') || '',
          phoneNumber: stagiaire.phoneNumber || stagiaire.phone,
          role: 'Stagiaire',
          tuteurId: stagiaire.tuteurId,
          startDate: stagiaire.startDate,
          endDate: stagiaire.endDate,
          departmentId: stagiaire.departmentId,
          departmentName: stagiaire.departmentName
        };
        this.openEditStagiaireModal(fallbackData);
      }
    });
  }
  
  openEditStagiaireModal(userData: any): void {
    const dialogRef = this.dialog.open(AddStagiaireComponent, {
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
        formData.append('Role', 'Stagiaire');
        
        // Ajouter les relations seulement si elles sont fournies
        if (result.tuteurId !== undefined) {
          formData.append('TuteurId', result.tuteurId ? result.tuteurId.toString() : '');
        }
        
        if (result.departmentId !== undefined) {
          formData.append('DepartmentId', result.departmentId ? result.departmentId.toString() : '');
        }
        
        if (result.universityId !== undefined) {
          formData.append('UniversityId', result.universityId ? result.universityId.toString() : '');
        }
        
        // Ajouter les dates seulement si elles sont fournies
        if (result.startDate) {
          const startDate = typeof result.startDate === 'string' 
            ? result.startDate 
            : new Date(result.startDate).toISOString();
          formData.append('StartDate', startDate);
        }
        
        if (result.endDate !== undefined) {
          if (result.endDate) {
            const endDate = typeof result.endDate === 'string' 
              ? result.endDate 
              : new Date(result.endDate).toISOString();
            formData.append('EndDate', endDate);
          } else {
            formData.append('EndDate', '');
          }
        }
        
        // Ajouter les champs spécifiques aux stagiaires seulement s'ils sont fournis
        if (result.note !== undefined) formData.append('Note', result.note.toString());
        if (result.stage !== undefined) formData.append('Stage', result.stage);
        if (result.etudiant !== undefined) formData.append('Etudiant', result.etudiant);
        if (result.status !== undefined) formData.append('Statuts', result.status ? 'true' : 'false');
        
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
        
        // Utiliser le nouveau service pour envoyer les données
        this.userService.updateStagiaireFormData(userData.id, formData).subscribe({
          next: (response: any) => {
            console.log('Réponse du serveur:', response);
            
            this.snackBar.open('Stagiaire mis à jour avec succès', 'Fermer', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom'
            });
            this.loadStagiaires();
          },
          error: (error: any) => {
            console.error('Erreur lors de la mise à jour du stagiaire:', error);
            
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
            
            this.snackBar.open('Erreur lors de la mise à jour du stagiaire: ' + errorMsg, 'Fermer', {
              duration: 5000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom'
            });
          }
        });
      }
    });
  }
  
  loadStagiaires(): void {
    this.isLoading = true;
  
    this.userService.getAllTuteurs().subscribe({
      next: (tuteurs) => {
        const tuteurMap = new Map<number, Tuteur>();
        tuteurs.forEach(tuteur => {
          tuteurMap.set(tuteur.id, tuteur);
        });
  
        this.userService.getAllUsers().subscribe({
          next: (users) => {
            const stagiaireUsers = users.filter(user => this.isStagiaireUser(user));
  
            this.stagiaireList = stagiaireUsers.map(user => {
              const userAny = user as any;
  
              // Log department info for debugging
              console.log(`User ID: ${user.id}, Department info:`, userAny.department, 'DepartmentId:', userAny.departmentId);
  
              // Déterminer le nom et l'ID du département
              let departmentName = 'Non assigné';
              let departmentId = null;
              
              if (userAny.department && typeof userAny.department === 'object') {
                departmentId = userAny.department.id;
                departmentName = userAny.department.departmentName;
              } else if (userAny.departmentId) {
                departmentId = userAny.departmentId;
                departmentName = this.getDepartmentName(departmentId);
              }
  
              // Déterminer le tuteur
              let tuteurName = 'Non assigné';
              const tuteurId = userAny.tuteurId;
  
              if (tuteurId && tuteurMap.has(tuteurId)) {
                const tuteur = tuteurMap.get(tuteurId);
                tuteurName = `${tuteur?.firstName || ''} ${tuteur?.lastName || ''}`.trim();
              } else if (userAny.tuteur) {
                tuteurName = `${userAny.tuteur.firstName || ''} ${userAny.tuteur.lastName || ''}`.trim();
              }
  
              if (!tuteurName || tuteurName.trim() === '') {
                tuteurName = 'Non assigné';
              }

               // Ajout: Déterminer le nom de l'université
  let universityName = 'Non assigné';
  if (userAny.university && typeof userAny.university === 'object') {
    universityName = userAny.university.universityname || 'Non assigné';
  }
  
              return {
                id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                position: userAny.position || 'Stagiaire',
                email: user.email,
                phone: userAny.phoneNumber || 'Non renseigné',
                imageUrl: this.getDefaultImageUrl(userAny),
                isFavorite: false,
                username: userAny.username,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: userAny.phoneNumber,
                role: userAny.role,
                tuteurId: tuteurId,
                tuteurName: tuteurName,
                startDate: userAny.startDate,
                endDate: userAny.endDate,
                departmentId: departmentId,
                departmentName: departmentName,
                universityId: userAny.universityId,
                universityName: universityName,
                stage: this.formatStageType(userAny.stage),
                etudiant: this.formatNiveauEtude(userAny.etudiant),
                statuts: userAny.statuts,
                note: userAny.note,
                highlighted: false
              };
            });
  
            this.applyFilters();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des stagiaires:', error);
            this.snackBar.open('Erreur lors du chargement des données', 'Fermer', {
              duration: 3000
            });
            this.isLoading = false;
            this.loadSampleData();
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement des tuteurs:', error);
        this.snackBar.open('Erreur lors du chargement des tuteurs', 'Fermer', {
          duration: 3000
        });
        this.getUsersWithFallback();
      }
    });
  }

  private getUsersWithFallback(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const stagiaireUsers = users.filter(user => this.isStagiaireUser(user));
        
        const observables = stagiaireUsers.map(stagiaire => {
          const stagiaireAny = stagiaire as any;
          if (stagiaireAny.tuteurId) {
            return this.userService.getTuteurById(stagiaireAny.tuteurId).pipe(
              tap(tuteur => {
                stagiaireAny.tuteur = tuteur;
              }),
              catchError(error => {
                console.error(`Erreur lors de la récupération du tuteur ID=${stagiaireAny.tuteurId}:`, error);
                return of(null);
              })
            );
          }
          return of(null);
        });
        
        forkJoin(observables).subscribe({
          next: () => {
            this.stagiaireList = stagiaireUsers.map(user => {
              const userAny = user as any;
              
              // Déterminer le nom et l'ID du département
              let departmentName = 'Non assigné';
              let departmentId = null;
              
              if (userAny.department && typeof userAny.department === 'object') {
                departmentId = userAny.department.id;
                departmentName = userAny.department.departmentName;
              } else if (userAny.departmentId) {
                departmentId = userAny.departmentId;
                departmentName = this.getDepartmentName(departmentId);
              }
              
              // Déterminer le tuteur
              let tuteurName = 'Non assigné';
              if (userAny.tuteur) {
                tuteurName = `${userAny.tuteur.firstName || ''} ${userAny.tuteur.lastName || ''}`.trim();
                if (!tuteurName || tuteurName.trim() === '') {
                  tuteurName = 'Non assigné';
                }
              }
              
              return {
                id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                position: userAny.position || 'Stagiaire',
                email: user.email,
                phone: userAny.phoneNumber || 'Non renseigné',
                imageUrl: this.getDefaultImageUrl(userAny),
                isFavorite: false,
                username: userAny.username,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: userAny.phoneNumber,
                role: userAny.role,
                tuteurId: userAny.tuteurId,
                tuteurName: tuteurName,
                startDate: userAny.startDate,
                endDate: userAny.endDate,
                departmentId: departmentId,
                departmentName: departmentName,
                note: userAny.note,
                highlighted: false
              };
            });
            
            this.applyFilters();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur lors de la récupération des détails des tuteurs:', error);
            this.isLoading = false;
            this.loadSampleData();
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement des stagiaires:', error);
        this.isLoading = false;
        this.loadSampleData();
      }
    });
  }

  private isStagiaireUser(user: User): boolean {
    const userAny = user as any;
    return user.role === UserRole.Stagiaire || 
           (typeof userAny.role === 'string' && userAny.role === 'Stagiaire') ||
           userAny.roleId === 3 || 
           (typeof userAny.role === 'number' && userAny.role === 3);
  }
  
  private getDefaultImageUrl(user: any): string {
    if (user.profilePictureUrl) return user.profilePictureUrl;
    if (user.imageUrl) return user.imageUrl;
    return 'assets/images/default-profile.jpg';
  }

  loadSampleData(): void {
    // Créer des départements exemple
    this.departments = [
      { id: 1, departmentName: 'IT' },
      { id: 2, departmentName: 'Finance' },
      { id: 3, departmentName: 'Comptabilité' }
    ];
    
    this.stagiaireList = [
      {
        id: 1,
        name: 'Paul Dupuis',
        position: 'Développeur Logiciel',
        email: 'paul.dupuis@example.com',
        phone: '+33 123 456 789',
        imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
        isFavorite: false,
        username: 'pdupuis',
        firstName: 'Paul',
        lastName: 'Dupuis',
        phoneNumber: '+33 123 456 789',
        role: 'Stagiaire',
        tuteurId: 1,
        tuteurName: 'Jean Mentor',
        startDate: '2023-01-15',
        endDate: '2023-07-15',
        departmentId: 1,
        departmentName: 'IT',
        note: 4.8,
        highlighted: false
      },
      {
        id: 2,
        name: 'Sophie Martin',
        position: 'Ingénieur Réseau',
        email: 'sophie.martin@example.com',
        phone: '+33 987 654 321',
        imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
        isFavorite: true,
        username: 'smartin',
        firstName: 'Sophie',
        lastName: 'Martin',
        phoneNumber: '+33 987 654 321',
        role: 'Stagiaire',
        tuteurId: 2,
        tuteurName: 'Marie Coach',
        startDate: '2023-02-01',
        endDate: '2023-06-01',
        departmentId: 1,
        departmentName: 'IT',
        note: 4.6,
        highlighted: false
      },
      {
        id: 3,
        name: 'Thomas Laurent',
        position: 'Analyste Financier',
        email: 'thomas.laurent@example.com',
        phone: '+33 654 321 987',
        imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
        isFavorite: false,
        username: 'tlaurent',
        firstName: 'Thomas',
        lastName: 'Laurent',
        phoneNumber: '+33 654 321 987',
        role: 'Stagiaire',
        tuteurId: 3,
        tuteurName: 'Pierre Expert',
        startDate: '2023-03-15',
        endDate: undefined,
        departmentId: 2,
        departmentName: 'Finance',
        note: 4.2,
        highlighted: false
      },
      {
        id: 4,
        name: 'Camille Dubois',
        position: 'Designer UX/UI',
        email: 'camille.dubois@example.com',
        phone: '+33 789 456 123',
        imageUrl: 'https://randomuser.me/api/portraits/women/29.jpg',
        isFavorite: true,
        username: 'cdubois',
        firstName: 'Camille',
        lastName: 'Dubois',
        phoneNumber: '+33 789 456 123',
        role: 'Stagiaire',
        tuteurId: 4,
        tuteurName: 'Julie Designer',
        startDate: '2023-04-01',
        endDate: '2023-10-01',
        departmentId: 1,
        departmentName: 'IT',
        note: 4.9,
        highlighted: false
      },
      {
        id: 5,
        name: 'Alexandre Moreau',
        position: 'Assistant Marketing',
        email: 'alexandre.moreau@example.com',
        phone: '+33 456 789 123',
        imageUrl: 'https://randomuser.me/api/portraits/men/62.jpg',
        isFavorite: false,
        username: 'amoreau',
        firstName: 'Alexandre',
        lastName: 'Moreau',
        phoneNumber: '+33 456 789 123',
        role: 'Stagiaire',
        tuteurId: 5,
        tuteurName: 'Sophie Marketer',
        startDate: '2023-05-15',
        endDate: '2023-11-15',
        departmentId: 2,
        departmentName: 'Finance',
        note: 3.8,
        highlighted: false
      },
      {
        id: 6,
        name: 'Emma Bernard',
        position: 'Assistante RH',
        email: 'emma.bernard@example.com',
        phone: '+33 321 654 987',
        imageUrl: 'https://randomuser.me/api/portraits/women/17.jpg',
        isFavorite: false,
        username: 'ebernard',
        firstName: 'Emma',
        lastName: 'Bernard',
        phoneNumber: '+33 321 654 987',
        role: 'Stagiaire',
        tuteurId: 6,
        tuteurName: 'Julien RH',
        startDate: '2023-06-01',
        endDate: undefined,
        departmentId: 3,
        departmentName: 'Comptabilité',
        note: 4.5,
        highlighted: false
      }
    ];
    
    this.applyFilters();
  }

  toggleFavorite(stagiaire: StagiairePerson): void {
    stagiaire.isFavorite = !stagiaire.isFavorite;
    
    const message = stagiaire.isFavorite 
      ? `${stagiaire.name} ajouté aux favoris`
      : `${stagiaire.name} retiré des favoris`;
    
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
    
    if (this.showOnlyFavorites) {
      this.applyFilters();
    }
  }

  openAddStagiaireModal(): void {
    const dialogRef = this.dialog.open(AddStagiaireComponent, {
      width: '800px',
      disableClose: true,
      data: { isEditMode: false }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const formData = new FormData();
        
        // Champs d'identification (obligatoires)
        formData.append('Username', result.username);
        formData.append('Email', result.email);
        formData.append('Password', result.password);
        formData.append('ConfirmPassword', result.confirmPassword);
        
        // Informations personnelles
        formData.append('FirstName', result.firstName);
        formData.append('LastName', result.lastName);
        formData.append('PhoneNumber', result.phoneNumber || '');
        formData.append('Role', 'Stagiaire'); // Forcer le rôle à Stagiaire
        
        // Informations de stage
        formData.append('TuteurId', result.tuteurId?.toString() || '');
        formData.append('TuteurName', ''); // Champ requis par l'API
        
        // Dates du stage
        if (result.startDate) {
          formData.append('StartDate', typeof result.startDate === 'string' ? 
            result.startDate : new Date(result.startDate).toISOString());
        } else {
          formData.append('StartDate', '');
        }
        
        if (result.endDate) {
          formData.append('EndDate', typeof result.endDate === 'string' ? 
            result.endDate : new Date(result.endDate).toISOString());
        } else {
          formData.append('EndDate', '');
        }
        
        // Informations académiques et départementales
        formData.append('DepartmentId', result.departmentId?.toString() || '1'); // Valeur par défaut: 1
        formData.append('UniversityId', result.universityId?.toString() || ''); // Champ requis par l'API
        formData.append('Stage', result.stage || 'stage_pfe'); // Valeur par défaut: stage_pfe
        formData.append('Etudiant', result.etudiant || 'licence'); // Valeur par défaut: licence
        
        // Champs supplémentaires requis par l'API
        formData.append('YearsExperience', '');
        formData.append('Note', '');
        formData.append('status', result.status === true ? 'true' : 'false');
        
        // Photo de profil
        if (result.profilePicture) {
          formData.append('ProfilePicture', result.profilePicture);
        }
        
        // Journalisation pour le débogage
        const formDataEntries: Array<string> = [];
        formData.forEach((value, key) => {
          formDataEntries.push(`${key}: ${value instanceof File ? value.name : value}`);
        });
        console.log('Données à envoyer à l\'API:', formDataEntries);
        
        this.authService.registerWithFormData(formData).subscribe({
          next: (response: any) => {
            this.snackBar.open('Stagiaire ajouté avec succès', 'Fermer', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'bottom'
            });
            this.loadStagiaires();
          },
          error: (error) => {
            console.error('Erreur lors de l\'ajout du stagiaire:', error);
            this.snackBar.open('Erreur lors de l\'ajout du stagiaire: ' + (error.message || 'Une erreur est survenue'), 'Fermer', {
              duration: 3000,
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
    if (relativeUrl.startsWith('http')) return relativeUrl;
    return `${environment.apiUrl}${relativeUrl}`;
  }

  confirmDelete(stagiaire: StagiairePerson): void {
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer le stagiaire ${stagiaire.name} ?`);
    
    if (confirmed) {
      this.deleteStagiaire(stagiaire);
    }
  }
  
  deleteStagiaire(stagiaire: StagiairePerson): void {
    this.isLoading = true;
    
    this.userService.deleteUser(stagiaire.id).subscribe({
      next: () => {
        this.snackBar.open(`${stagiaire.name} a été supprimé avec succès`, 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        this.loadStagiaires();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression du stagiaire:', error);
        this.snackBar.open('Erreur lors de la suppression du stagiaire', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        this.isLoading = false;
      }
    });
  }


  // Formatage du type de stage
private formatStageType(stage: any): string {
  if (!stage) return 'Stage ETE';
  
  if (typeof stage === 'string') {
    return stage === 'stage_été' ? 'Stage été' : 
           stage === 'stage_pfe' ? 'Stage PFE' : 
           stage;
  } else if (typeof stage === 'number') {
    return stage === 0 ? 'Stage été' : 
           stage === 1 ? 'Stage PFE' : 
           'Non assigné';
  }
  
  return 'Non assigné';
}

// Formatage du niveau d'étude
private formatNiveauEtude(etudiant: any): string {
  if (!etudiant) return 'Ingénierie';
  
  if (typeof etudiant === 'string') {
    return etudiant === 'ingénierie' ? 'Ingénierie' :
           etudiant === 'licence' ? 'Licence' :
           etudiant === 'master' ? 'Master' :
           etudiant;
  } else if (typeof etudiant === 'number') {
    return etudiant === 0 ? 'Ingénierie' :
           etudiant === 1 ? 'Licence' :
           etudiant === 2 ? 'Master' :
           'Non assigné';
  }
  
  return 'Non assigné';
}

toggleStatus(stagiaire: StagiairePerson): void {
  // Nouveau statut (inversé)
  const newStatus = !stagiaire.statuts;
  
  // Préparation des données à envoyer
  const formData = new FormData();
  formData.append('Id', stagiaire.id.toString());
  formData.append('Statuts', newStatus ? 'true' : 'false');
  
  // Mise à jour du statut via l'API
  this.userService.updateStagiaireFormData(stagiaire.id, formData).subscribe({
    next: (response) => {
      // Mettre à jour le stagiaire dans la liste locale
      stagiaire.statuts = newStatus;
      
      this.snackBar.open(
        `Statut de ${stagiaire.name} modifié : ${newStatus ? 'Actif' : 'Inactif'}`, 
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
confirmToggleStatus(stagiaire: StagiairePerson): void {
  const action = stagiaire.statuts ? 'désactiver' : 'activer';
  const confirmed = window.confirm(`Êtes-vous sûr de vouloir ${action} ${stagiaire.name} ?`);
  if (confirmed) {
    this.toggleStatus(stagiaire);
  }
}

}