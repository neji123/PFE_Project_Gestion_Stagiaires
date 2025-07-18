import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { JobOfferService, JobOfferDto } from '../../../services/JobOffer/job-offer.service';
import { UserService } from '../../../services/User/user.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { Department } from '../../../components/models/user';

@Component({
  selector: 'app-job-offer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './job-offer-list.component.html',
  styleUrls: ['./job-offer-list.component.scss']
})
export class JobOfferListComponent implements OnInit {
  // Injection des services
  private jobOfferService = inject(JobOfferService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals pour la gestion d'état réactive
  jobOffers = signal<JobOfferDto[]>([]);
  departments = signal<Department[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Filtres
  searchKeyword = signal('');
  selectedDepartmentId = signal<number | null>(null);
  showMyOffersOnly = signal(false);
  
  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(12);
  
  // Utilisateur actuel
  currentUser = signal<any>(null);

  // Computed values
  filteredOffers = computed(() => {
    let offers = this.jobOffers();
    
    // Filtre par mot-clé
    const keyword = this.searchKeyword().toLowerCase().trim();
    if (keyword) {
      offers = offers.filter(offer => 
        offer.title.toLowerCase().includes(keyword) ||
        offer.description.toLowerCase().includes(keyword) ||
        offer.requiredSkills.toLowerCase().includes(keyword) ||
        offer.departmentName?.toLowerCase().includes(keyword)
      );
    }
    
    // Filtre par département
    const deptId = this.selectedDepartmentId();
    if (deptId) {
      offers = offers.filter(offer => offer.departmentId === deptId);
    }
    
    // Filtre "Mes offres uniquement"
    if (this.showMyOffersOnly() && this.currentUser()) {
      offers = offers.filter(offer => offer.publishedByUserId === this.currentUser().id);
    }
    
    return offers;
  });

  totalPages = computed(() => 
    Math.ceil(this.filteredOffers().length / this.itemsPerPage())
  );

  paginatedOffers = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredOffers().slice(start, end);
  });

  // Statistiques
  totalOffers = computed(() => this.jobOffers().length);
  myOffersCount = computed(() => 
    this.currentUser() 
      ? this.jobOffers().filter(offer => offer.publishedByUserId === this.currentUser().id).length 
      : 0
  );

  ngOnInit() {
    this.loadCurrentUser();
    this.loadJobOffers();
    this.loadDepartments();
  }

  private loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        console.log('👤 Utilisateur actuel:', user);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
      }
    });
  }

  private loadJobOffers() {
    this.loading.set(true);
    this.error.set(null);
    
    this.jobOfferService.getAllJobOffers().subscribe({
      next: (offers) => {
        this.jobOffers.set(offers);
        this.loading.set(false);
        console.log('✅ Offres d\'emploi chargées:', offers.length);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des offres:', error);
        this.error.set('Impossible de charger les offres d\'emploi');
        this.loading.set(false);
      }
    });
  }

  private loadDepartments() {
    // Utilisation du service existant pour charger les départements
    // Vous pouvez adapter selon votre implémentation existante
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        // Extraire les départements uniques des utilisateurs
        const uniqueDepts = new Map<number, Department>();
        users.forEach(user => {
          if (user.department) {
            uniqueDepts.set(user.department.id, user.department);
          }
        });
        this.departments.set(Array.from(uniqueDepts.values()));
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des départements:', error);
      }
    });
  }

  // Actions de filtrage
  onSearchChange() {
    this.currentPage.set(1); // Retour à la première page
  }

  onDepartmentChange() {
    this.currentPage.set(1);
  }

  onShowMyOffersChange() {
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchKeyword.set('');
    this.selectedDepartmentId.set(null);
    this.showMyOffersOnly.set(false);
    this.currentPage.set(1);
  }

  // Navigation
  navigateToCreate() {
    this.router.navigate(['/job-offers/create']);
  }

  navigateToEdit(offerId: number) {
    this.router.navigate(['/job-offers/edit', offerId]);
  }

  navigateToView(offerId: number) {
    this.router.navigate(['/job-offers/', offerId]);
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Actions sur les offres
  async deleteOffer(offer: JobOfferDto) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'offre "${offer.title}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      await this.jobOfferService.deleteJobOffer(offer.id).toPromise();
      
      // Recharger la liste après suppression
      this.loadJobOffers();
      
      // Optionnel : Message de succès
      console.log('✅ Offre supprimée avec succès');
      
      // Si vous avez un service de notification, utilisez-le ici :
      // this.notificationService.showSuccess('Offre supprimée', `L'offre "${offer.title}" a été supprimée.`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      this.error.set('Erreur lors de la suppression de l\'offre');
      
      // Si vous avez un service de notification :
      // this.notificationService.showError('Erreur', 'Impossible de supprimer l\'offre');
    }
  }

  refreshOffers() {
    this.loadJobOffers();
  }

  // Utilitaires
  isRH(): boolean {
    return this.currentUser()?.role === 'RHs';
  }

  isMyOffer(offer: JobOfferDto): boolean {
    return this.currentUser() && offer.publishedByUserId === this.currentUser().id;
  }

  formatSkills(skills: string): string[] {
    return this.jobOfferService.formatSkills(skills);
  }

  formatDate(date: Date | string): string {
    return this.jobOfferService.formatPublishedDate(date);
  }

  truncateText(text: string, maxLength: number = 150): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2; // Nombre de pages à afficher de chaque côté de la page actuelle
    
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }
    
    return range;
  }

  // Track by function pour optimiser le rendu de la liste
  trackByOfferId(index: number, offer: JobOfferDto): number {
    return offer.id;
  }

  // Expose Math pour le template
  Math = Math;
}