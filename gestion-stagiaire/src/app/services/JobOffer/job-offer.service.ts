import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

// Interfaces pour les DTOs
export interface CreateJobOfferDto {
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
}

export interface UpdateJobOfferDto {
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
}

export interface JobOfferDto {
  id: number;
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
  departmentName: string;
  publishedByUserId: number;
  publishedByName: string;
  publishedAt: Date;
}

export interface JobOfferSimpleDto {
  id: number;
  title: string;
  departmentName: string;
  publishedByName: string;
  publishedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class JobOfferService {
  private apiUrl = `${environment.apiUrl}/api/joboffer`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Headers HTTP avec token d'authentification
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  private handleError(error: any) {
    console.error('Une erreur s\'est produite dans JobOfferService:', error);
    return throwError(() => error);
  }

  /**
   * 📋 Récupère toutes les offres d'emploi
   */
  getAllJobOffers(): Observable<JobOfferDto[]> {
    console.log('🔍 Récupération de toutes les offres d\'emploi...');
    return this.http.get<JobOfferDto[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        tap(offers => console.log(`✅ ${offers.length} offres récupérées`)),
        catchError(this.handleError)
      );
  }

  /**
   * 🎯 Récupère une offre d'emploi par son ID
   */
  getJobOfferById(id: number): Observable<JobOfferDto> {
    console.log(`🔍 Récupération de l'offre d'emploi ${id}...`);
    return this.http.get<JobOfferDto>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(offer => console.log(`✅ Offre récupérée: ${offer.title}`)),
        catchError(this.handleError)
      );
  }

  /**
   * 🏢 Récupère les offres d'emploi par département
   */
  getJobOffersByDepartment(departmentId: number): Observable<JobOfferDto[]> {
    console.log(`🔍 Récupération des offres pour le département ${departmentId}...`);
    return this.http.get<JobOfferDto[]>(`${this.apiUrl}/department/${departmentId}`, { headers: this.getHeaders() })
      .pipe(
        tap(offers => console.log(`✅ ${offers.length} offres trouvées pour le département`)),
        catchError(this.handleError)
      );
  }

  /**
   * 👤 Récupère les offres d'emploi publiées par un utilisateur
   */
  getJobOffersByPublisher(publisherId: number): Observable<JobOfferDto[]> {
    console.log(`🔍 Récupération des offres publiées par l'utilisateur ${publisherId}...`);
    return this.http.get<JobOfferDto[]>(`${this.apiUrl}/publisher/${publisherId}`, { headers: this.getHeaders() })
      .pipe(
        tap(offers => console.log(`✅ ${offers.length} offres trouvées pour le publieur`)),
        catchError(this.handleError)
      );
  }

  /**
   * ⏰ Récupère les offres d'emploi récentes
   */
  getRecentJobOffers(count: number = 10): Observable<JobOfferSimpleDto[]> {
    console.log(`🔍 Récupération des ${count} offres récentes...`);
    return this.http.get<JobOfferSimpleDto[]>(`${this.apiUrl}/recent?count=${count}`, { headers: this.getHeaders() })
      .pipe(
        tap(offers => console.log(`✅ ${offers.length} offres récentes récupérées`)),
        catchError(this.handleError)
      );
  }

  /**
   * 📝 Récupère les offres d'emploi de l'utilisateur connecté
   */
  getMyJobOffers(): Observable<JobOfferDto[]> {
    console.log('🔍 Récupération de mes offres d\'emploi...');
    return this.http.get<JobOfferDto[]>(`${this.apiUrl}/my-offers`, { headers: this.getHeaders() })
      .pipe(
        tap(offers => console.log(`✅ ${offers.length} de mes offres récupérées`)),
        catchError(this.handleError)
      );
  }

  /**
   * ➕ Crée une nouvelle offre d'emploi
   */
  createJobOffer(jobOffer: CreateJobOfferDto): Observable<JobOfferDto> {
    console.log('➕ Création d\'une nouvelle offre d\'emploi:', jobOffer.title);
    return this.http.post<JobOfferDto>(this.apiUrl, jobOffer, { headers: this.getHeaders() })
      .pipe(
        tap(createdOffer => console.log(`✅ Offre créée avec succès: ID ${createdOffer.id}`)),
        catchError(this.handleError)
      );
  }

  /**
   * ✏️ Met à jour une offre d'emploi existante
   */
  updateJobOffer(id: number, jobOffer: UpdateJobOfferDto): Observable<JobOfferDto> {
    console.log(`✏️ Mise à jour de l'offre d'emploi ${id}:`, jobOffer.title);
    return this.http.put<JobOfferDto>(`${this.apiUrl}/${id}`, jobOffer, { headers: this.getHeaders() })
      .pipe(
        tap(updatedOffer => console.log(`✅ Offre mise à jour avec succès: ${updatedOffer.title}`)),
        catchError(this.handleError)
      );
  }

  /**
   * 🗑️ Supprime une offre d'emploi
   */
  deleteJobOffer(id: number): Observable<any> {
    console.log(`🗑️ Suppression de l'offre d'emploi ${id}...`);
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => console.log(`✅ Offre ${id} supprimée avec succès`)),
        catchError(this.handleError)
      );
  }

  /**
   * 🔍 Recherche les offres d'emploi par mots-clés dans le titre ou les compétences
   */
  searchJobOffers(keyword: string): Observable<JobOfferDto[]> {
    console.log(`🔍 Recherche d'offres avec le mot-clé: "${keyword}"`);
    return this.getAllJobOffers().pipe(
      tap(allOffers => {
        const filteredOffers = allOffers.filter(offer => 
          offer.title.toLowerCase().includes(keyword.toLowerCase()) ||
          offer.requiredSkills.toLowerCase().includes(keyword.toLowerCase()) ||
          offer.description.toLowerCase().includes(keyword.toLowerCase())
        );
        console.log(`✅ ${filteredOffers.length} offres trouvées pour "${keyword}"`);
        return filteredOffers;
      })
    );
  }

  /**
   * 📊 Récupère les statistiques des offres d'emploi
   */
  getJobOffersStatistics(): Observable<any> {
    console.log('📊 Récupération des statistiques des offres d\'emploi...');
    return this.getAllJobOffers().pipe(
      tap(offers => {
        const stats = {
          totalOffers: offers.length,
          offersByDepartment: this.groupOffersByDepartment(offers),
          recentOffers: offers.filter(offer => {
            const publishedDate = new Date(offer.publishedAt);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return publishedDate >= oneWeekAgo;
          }).length
        };
        console.log('✅ Statistiques calculées:', stats);
        return stats;
      })
    );
  }

  /**
   * 📈 Groupe les offres par département
   */
  private groupOffersByDepartment(offers: JobOfferDto[]): { [key: string]: number } {
    return offers.reduce((acc, offer) => {
      const dept = offer.departmentName || 'Non spécifié';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  /**
   * ✅ Valide les données d'une offre d'emploi
   */
  validateJobOffer(jobOffer: CreateJobOfferDto | UpdateJobOfferDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!jobOffer.title?.trim()) {
      errors.push('Le titre est obligatoire');
    } else if (jobOffer.title.length > 200) {
      errors.push('Le titre ne peut pas dépasser 200 caractères');
    }

    if (!jobOffer.description?.trim()) {
      errors.push('La description est obligatoire');
    } else if (jobOffer.description.length > 5000) {
      errors.push('La description ne peut pas dépasser 5000 caractères');
    }

    if (!jobOffer.requiredSkills?.trim()) {
      errors.push('Les compétences requises sont obligatoires');
    } else if (jobOffer.requiredSkills.length > 2000) {
      errors.push('Les compétences ne peuvent pas dépasser 2000 caractères');
    }

    if (!jobOffer.departmentId || jobOffer.departmentId <= 0) {
      errors.push('Le département est obligatoire');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 🎨 Formate les compétences pour l'affichage
   */
  formatSkills(skills: string): string[] {
    if (!skills) return [];
    return skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }

  /**
   * 📅 Formate la date de publication
   */
  formatPublishedDate(date: Date | string): string {
    const publishedDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - publishedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Publié aujourd\'hui';
    } else if (diffDays === 2) {
      return 'Publié hier';
    } else if (diffDays <= 7) {
      return `Publié il y a ${diffDays - 1} jours`;
    } else {
      return `Publié le ${publishedDate.toLocaleDateString('fr-FR')}`;
    }
  }
}