import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { DepartmentService } from '../../../services/Department/department.service';
import { environment } from '../../../environments/environment';
import { User, UserRole, Department } from '../../models/user';
import { MatDialog } from '@angular/material/dialog';
import { AffecterStagiairesComponent } from '../affecter-stagiaires/affecter-stagiaires.component';

interface TuteurPerson {
  id: number;
  name: string;
  speciality: string;
  email: string;
  phone: string;
  image: string;
  isFavorite: boolean;
  departmentId?: number;
  departmentName?: string;
  yearsExperience?: number;
  skills?: string[];
  bio?: string;
  stagiaireCount?: number;
  stagiaires?: {
    id: number,
    name: string,
    position: string,
    duration: string,
    rating: number,
    image?: string,
    startDate?: Date,
    endDate?: Date
  }[];
}

@Component({
  selector: 'app-detail-tuteur',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    AffecterStagiairesComponent,
    MatChipsModule,
    SidebarComponent,
    MatSnackBarModule
  ],
  templateUrl: './detail-tuteur.component.html',
  styleUrls: ['./detail-tuteur.component.scss']
})
export class DetailTuteurComponent implements OnInit {
  isSidebarVisible = true;
  tuteurId: number = 0;
  tuteurPerson?: TuteurPerson;
  isLoading = true;
  error = false;
  departments: Department[] = [];

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private snackBar: MatSnackBar,
    private userService: UserService,
    private departmentService: DepartmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.route.params.subscribe(params => {
      this.tuteurId = +params['id']; // Conversion en nombre
      this.loadTuteurData();
    });
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

  // Méthode pour obtenir le nom du département à partir de l'ID
  getDepartmentName(departmentId?: number): string {
    if (!departmentId) return 'Non assigné';
    
    const department = this.departments.find(d => d.id === departmentId);
    return department ? department.departmentName : 'Non assigné';
  }

  loadTuteurData(): void {
    this.isLoading = true;
    this.error = false;

    this.userService.getTuteurById(this.tuteurId).subscribe({
      next: (user) => {
        console.log('Utilisateur récupéré depuis API:', user);
        
        // Cast user à any pour accéder aux propriétés spécifiques des Tuteurs
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
        
        // Conversion au format TuteurPerson
        this.tuteurPerson = {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          speciality: userAny.speciality || 'Formation générale',
          email: user.email,
          phone: userAny.phoneNumber || '+33 123 456 789',
          image: this.getImageUrl(userAny.profilePictureUrl || userAny.imageUrl),
          isFavorite: false,
          departmentId: departmentId,
          departmentName: departmentName,
          yearsExperience: userAny.yearsExperience || 0,
          skills: ['Accompagnement de stagiaires', 'Évaluation', 'Formation', 'Coaching'],
          bio: `${user.firstName} ${user.lastName} est un tuteur chez EY, spécialisé en ${userAny.speciality || 'formation générale'} avec ${userAny.yearsExperience || 0} ans d'expérience dans son domaine.`,
          stagiaireCount: 0,
          stagiaires: []
        };
        
        // Charger les stagiaires de ce tuteur
        this.loadStagiairesData();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération du tuteur:', err);
        this.error = true;
        this.isLoading = false;
        
        // Pour les tests en cas d'erreur
        this.loadFallbackData();
      }
    });
  }

  // Charger les stagiaires pour ce tuteur
  loadStagiairesData(): void {
    if (!this.tuteurPerson) return;
    
    this.userService.getStagiairesByTuteur(this.tuteurId).subscribe({
      next: (stagiaires) => {
        console.log('Stagiaires récupérés:', stagiaires);
        
        if (stagiaires && stagiaires.length > 0) {
          this.tuteurPerson!.stagiaires = stagiaires.map(stagiaire => {
            return {
              id: stagiaire.id,
              name: `${stagiaire.firstName} ${stagiaire.lastName}`,
              position: stagiaire.position || 'Stagiaire',
              duration: this.calculateDuration(stagiaire.startDate, stagiaire.endDate),
              rating: stagiaire.note || 4.5,
              image: this.getImageUrl(stagiaire.profilePictureUrl || stagiaire.imageUrl),
              startDate: stagiaire.startDate ? new Date(stagiaire.startDate) : undefined,
              endDate: stagiaire.endDate ? new Date(stagiaire.endDate) : undefined
            };
          });
          
          this.tuteurPerson!.stagiaireCount = this.tuteurPerson!.stagiaires.length;
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des stagiaires:', err);
        // Utiliser des stagiaires de test en cas d'erreur
        this.tuteurPerson!.stagiaires = this.generateSampleStagiaires();
        this.tuteurPerson!.stagiaireCount = this.tuteurPerson!.stagiaires.length;
        this.isLoading = false;
      }
    });
  }

  // Calculer la durée du stage en mois
  calculateDuration(startDate?: string, endDate?: string): string {
    if (!startDate || !endDate) return 'Durée inconnue';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
                         (end.getMonth() - start.getMonth());
    
    return `${diffInMonths} mois`;
  }

  // Generate sample stagiaires for demonstration
  generateSampleStagiaires() {
    return [
      {
        id: 1,
        name: 'Paul Dupuis',
        position: 'Développeur Logiciel',
        duration: '6 mois',
        rating: 4.8,
        image: 'https://randomuser.me/api/portraits/men/32.jpg',
        startDate: new Date('2023-01-15'),
        endDate: new Date('2023-07-15')
      },
      {
        id: 2,
        name: 'Sophie Martin',
        position: 'Designer UX/UI',
        duration: '4 mois',
        rating: 4.6,
        image: 'https://randomuser.me/api/portraits/women/44.jpg',
        startDate: new Date('2023-02-01'),
        endDate: new Date('2023-06-01')
      },
      {
        id: 3,
        name: 'Lucas Durand',
        position: 'Data Analyst',
        duration: '5 mois',
        rating: 4.7,
        image: 'https://via.placeholder.com/150',
        startDate: new Date('2023-03-01'),
        endDate: new Date('2023-08-01')
      }
    ];
  }

  // Charger des données de secours en cas d'erreur avec l'API
  loadFallbackData(): void {
    this.tuteurPerson = {
      id: this.tuteurId,
      name: 'Jean Dupont',
      speciality: 'Développement Logiciel',
      email: 'jean.dupont@example.com',
      phone: '+33 123 456 789',
      image: 'https://randomuser.me/api/portraits/men/75.jpg',
      isFavorite: false,
      departmentId: 1,
      departmentName: 'IT',
      yearsExperience: 8,
      skills: ['Mentorat', 'Programmation', 'Architecture logicielle', 'Formation'],
      bio: 'Jean Dupont est un tuteur expérimenté chez EY, spécialisé en développement logiciel avec 8 ans d\'expérience. Il accompagne les stagiaires dans leurs projets techniques et les aide à développer leurs compétences professionnelles.',
      stagiaireCount: 3,
      stagiaires: this.generateSampleStagiaires()
    };
    
    this.isLoading = false;
  }

  getImageUrl(relativeUrl: string | null | undefined): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    
    // Si c'est déjà une URL complète, retournez-la telle quelle
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Sinon, préfixez avec l'URL du backend
    return `${environment.apiUrl}${relativeUrl}`;
  }

  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }

  toggleFavorite(): void {
    if (this.tuteurPerson) {
      this.tuteurPerson.isFavorite = !this.tuteurPerson.isFavorite;
      const message = this.tuteurPerson.isFavorite 
        ? `${this.tuteurPerson.name} ajouté aux favoris`
        : `${this.tuteurPerson.name} retiré des favoris`;
      
      this.snackBar.open(message, 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    }
  }

  contactTuteur(): void {
    if (this.tuteurPerson) {
      window.location.href = `mailto:${this.tuteurPerson.email}`;
    }
  }

  callTuteur(): void {
    if (this.tuteurPerson) {
      window.location.href = `tel:${this.tuteurPerson.phone.replace(/\s/g, '')}`;
    }
  }

  goToStagiaireDetail(stagiaireId: number): void {
    this.router.navigate(['/stagiaire', stagiaireId]);
  }

  ouvrirDialogAffectation(): void {
    if (!this.tuteurPerson) return;
    
    const dialogRef = this.dialog.open(AffecterStagiairesComponent, {
      width: '600px',
      data: {
        tuteurId: this.tuteurId,
        tuteurName: this.tuteurPerson.name
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open(`${result.count} stagiaire(s) affecté(s) avec succès`, 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        // Recharger les données des stagiaires
        this.loadStagiairesData();
      }
    });
  }
  
  // Méthode pour retirer un stagiaire du tuteur
  retirerStagiaire(stagiaireId: number, stagiaireName: string, event: Event): void {
    event.stopPropagation(); // Empêcher la navigation
    
    const confirmed = window.confirm(`Voulez-vous vraiment retirer ${stagiaireName} de ce tuteur ?`);
    if (!confirmed) return;
    
    this.userService.retirerStagiaire(stagiaireId).subscribe({
      next: () => {
        this.snackBar.open(`${stagiaireName} a été retiré avec succès`, 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
        
        // Recharger les données des stagiaires
        this.loadStagiairesData();
      },
      error: (error) => {
        console.error('Erreur lors du retrait du stagiaire:', error);
        this.snackBar.open('Erreur lors du retrait du stagiaire', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });
      }
    });
  }
  hasStagiaires(): boolean {
    return !!this.tuteurPerson && !!this.tuteurPerson.stagiaires && this.tuteurPerson.stagiaires.length > 0;
  }
}