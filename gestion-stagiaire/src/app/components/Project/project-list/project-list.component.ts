import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../../services/Project/project.service';
import { Project } from '../../models/Project';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { environment } from '../../../environments/environment';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbPaginationModule, FormsModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  projects: Project[] = [];
  filteredProjects: Project[] = []; // Projets après filtrage
  loading = true;
  error: string | null = null;
  
  // Pagination
  page = 1;
  pageSize = 4;
  totalProjects = 0;
  
  // Filtres et recherche
  searchTerm: string = '';
  statusFilter: string = 'all';
  sortOption: string = 'titleAsc';
  
  // Mode d'affichage (grille ou liste)
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private projectService: ProjectService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.totalProjects = data.length;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des projets';
        this.loading = false;
        console.error(err);
      }
    });
  }

  // Appliquer les filtres et le tri
  applyFilters(): void {
    // Commencer avec tous les projets
    let filtered = [...this.projects];
    
    // Appliquer le filtre de recherche
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Appliquer le filtre de statut
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(project => {
        if (this.statusFilter === 'planned') {
          return project.startDate && project.endDate;
        } else if (this.statusFilter === 'progress') {
          return project.startDate && !project.endDate;
        } else if (this.statusFilter === 'unplanned') {
          return !project.startDate;
        }
        return true;
      });
    }
    
    // Appliquer le tri
    filtered.sort((a, b) => {
      switch (this.sortOption) {
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'titleDesc':
          return b.title.localeCompare(a.title);
        case 'dateDesc':
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        case 'dateAsc':
          const dateAsc = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateBsc = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateAsc - dateBsc;
        default:
          return 0;
      }
    });
    
    this.filteredProjects = filtered;
    this.totalProjects = filtered.length;
    
    // Réinitialiser la page si nécessaire
    if (this.page > Math.ceil(this.totalProjects / this.pageSize)) {
      this.page = 1;
    }
  }
  
  // Réinitialiser tous les filtres
  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortOption = 'titleAsc';
    this.applyFilters();
  }
  
  // Changer le mode d'affichage (grille ou liste)
  changeViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  viewProject(id: number): void {
    this.router.navigate(['/projects', id]);
  }

  editProject(id: number): void {
    this.router.navigate(['/projects/edit', id]);
  }

  deleteProject(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet?')) {
      this.projectService.deleteProject(id).subscribe({
        next: () => {
          this.projects = this.projects.filter(p => p.id !== id);
          this.applyFilters(); // Réappliquer les filtres après suppression
          
          // Afficher un message de réussite (peut être implémenté avec un service de notification)
          // this.notificationService.success('Projet supprimé avec succès');
        },
        error: (err) => {
          console.error('Erreur lors de la suppression', err);
          alert('Erreur lors de la suppression du projet');
        }
      });
    }
  }

  getImageUrl(url: string | null): string {
    if (!url) return 'assets/images/default-project.jpg';
    
    // Si l'URL commence déjà par http ou https, elle est absolue
    if (url.startsWith('http')) return url;
    
    // Si l'URL commence par un slash, c'est relatif à la racine du serveur
    if (url.startsWith('/')) return environment.apiUrl + url;
    
    // Sinon c'est relatif aux assets
    return 'assets/images/' + url;
  }

  handleImageError(event: any): void {
    // Remplacer par une image par défaut en cas d'erreur
    event.target.src = 'assets/images/default-project.jpg';
  }

  // Méthode pour obtenir les projets de la page courante
  get displayedProjects(): Project[] {
    const startIndex = (this.page - 1) * this.pageSize;
    // Utiliser filteredProjects au lieu de projects
    return this.filteredProjects.slice(startIndex, startIndex + this.pageSize);
  }

  // Méthode pour gérer le changement de page
  onPageChange(page: number): void {
    this.page = page;
    // On peut aussi défiler vers le haut de la page si nécessaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Méthode pour obtenir le statut du badge
  getStatusBadgeClass(project: Project): string {
    if (project.startDate && project.endDate) {
      return 'badge-status-planned'; // Planifié
    } else if (project.startDate) {
      return 'badge-status-progress'; // En cours
    } else {
      return 'badge-status-unplanned'; // Non planifié
    }
  }

  // Méthode pour obtenir le texte du statut
  getStatusText(project: Project): string {
    if (project.startDate && project.endDate) {
      return 'Planifié';
    } else if (project.startDate) {
      return 'En cours';
    } else {
      return 'Non planifié';
    }
  }
  
  // Méthode pour calculer le nombre total de pages
  getTotalPages(): number {
    return Math.ceil(this.totalProjects / this.pageSize);
  }
  
  // Génère un tableau intelligent pour l'affichage de la pagination
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

  // Méthode pour naviguer entre les projets de la page courante
  focusProject(index: number): void {
    // Marquer comme mis en évidence pour l'animation
    const currentProjects = [...this.displayedProjects];
    currentProjects.forEach((p, i) => {
      p.highlighted = i === index;
    });
    
    // Animation de défilement vers le projet
    const projectCards = document.querySelectorAll(this.viewMode === 'grid' ? '.project-card' : '.project-list-item');
    if (projectCards[index]) {
      projectCards[index].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
    
    // Réinitialiser l'état mis en évidence après un délai
    setTimeout(() => {
      currentProjects.forEach(p => {
        p.highlighted = false;
      });
    }, 1000);
  }
}