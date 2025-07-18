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
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UserService } from '../../../services/User/user.service';
import { environment } from '../../../environments/environment';
import { User, RH, UserRole } from '../../models/user';

interface RhPerson {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  image: string;
  isFavorite: boolean;
  department?: string;
  office?: string;
  joinDate?: string;
  skills?: string[];
  bio?: string;
}

@Component({
  selector: 'app-detail-rh',
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
    SidebarComponent,
    MatSnackBarModule
  ],
  templateUrl: './detail-rh.component.html',
  styleUrls: ['./detail-rh.component.scss']
})
export class DetailRhComponent implements OnInit {
  isSidebarVisible = true;
  rhId: number = 0;
  rhPerson?: RhPerson;
  isLoading = true;
  error = false;

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.rhId = +params['id']; // Conversion en nombre
      this.loadRhData();
    });
  }

  loadRhData(): void {
    this.isLoading = true;
    this.error = false;

    this.userService.getUserById(this.rhId).subscribe({
      next: (user) => {
        console.log('Utilisateur récupéré depuis API:', user);
        
        // Cast user à any pour accéder aux propriétés spécifiques des RH
        const userAny = user as any;
        
        // Conversion au format RhPerson
        this.rhPerson = {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          position: user.role === UserRole.RHs ? 'Directeur des Ressources Humaines' : 'Responsable RH',
          email: user.email,
          phone: userAny.phoneNumber || '+33 123 456 789',
          image: this.getImageUrl(userAny.profilePictureUrl || userAny.imageUrl),
          isFavorite: false,
          department: userAny.department || 'Ressources Humaines',
          office: userAny.office || 'Paris',
          joinDate: userAny.joinDate || (userAny.createdAt ? new Date(userAny.createdAt).toLocaleDateString() : '01/01/2023'),
          skills: ['Recrutement', 'Formation', 'Gestion des talents', 'Relations sociales'],
          bio: `${user.firstName} ${user.lastName} est un professionnel des ressources humaines chez EY avec plusieurs années d'expérience dans le domaine.`
        };
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la récupération du RH:', err);
        this.error = true;
        this.isLoading = false;
      }
    });
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
    if (this.rhPerson) {
      this.rhPerson.isFavorite = !this.rhPerson.isFavorite;
      const message = this.rhPerson.isFavorite 
        ? `${this.rhPerson.name} ajouté aux favoris`
        : `${this.rhPerson.name} retiré des favoris`;
      
      this.snackBar.open(message, 'Fermer', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      });
    }
  }

  contactRh(): void {
    if (this.rhPerson) {
      window.location.href = `mailto:${this.rhPerson.email}`;
    }
  }

  callRh(): void {
    if (this.rhPerson) {
      window.location.href = `tel:${this.rhPerson.phone.replace(/\s/g, '')}`;
    }
  }
}