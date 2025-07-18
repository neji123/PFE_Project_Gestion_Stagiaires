import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable,throwError,tap,of,map,switchMap } from 'rxjs';
import { User,RH, Tuteur, Stagiaire } from '../../components/models/user'; 
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiUrl}/api/users`;
  private isBrowser: boolean;
  
  constructor(private http: HttpClient,  @Inject(PLATFORM_ID) private platformId: any) {
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

  // Headers pour les requêtes multipart (sans Content-Type)
  private getMultipartHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }
  
  // Méthodes génériques pour tous les utilisateurs
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, { headers: this.getHeaders() });
  }
  
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
  
  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user, { headers: this.getHeaders() });
  }
  
  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user, { headers: this.getHeaders() });
  }
  
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
  
  // Méthodes spécifiques aux RH
  getAllRH(): Observable<RH[]> {
    return this.http.get<RH[]>(`${this.apiUrl}/rh`, { headers: this.getHeaders() });
  }
  
  // Méthodes spécifiques aux Tuteurs
  getAllTuteurs(): Observable<Tuteur[]> {
    return this.getUsersByRole('Tuteur');
  }
  
  createTuteur(tuteur: Tuteur): Observable<Tuteur> {
    return this.http.post<Tuteur>(`${this.apiUrl}/tuteur`, tuteur, { headers: this.getHeaders() });
  }
  
  // Méthodes spécifiques aux Stagiaires
  getAllStagiaires(): Observable<Stagiaire[]> {
    return this.http.get<Stagiaire[]>(`${this.apiUrl}/stagiaire`, { headers: this.getHeaders() });
  }
  
  createStagiaire(stagiaire: Stagiaire): Observable<Stagiaire> {
    return this.http.post<Stagiaire>(`${this.apiUrl}/stagiaire`, stagiaire, { headers: this.getHeaders() });
  }
  
  getApiBaseUrl(): string {
    return environment.apiUrl;
  }

  createRH(rh: RH): Observable<RH> {
    return this.http.post<RH>(`${this.apiUrl}/rh`, rh, { headers: this.getHeaders() });
  }

  // À ajouter dans UserService si ce n'est pas déjà fait
  registerWithFormData(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, formData);
  }

  private handleError(error: any) {
    console.error('Une erreur s\'est produite', error);
    return throwError(() => error);
  }

  updateRhJson(id: number, userData: any): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    console.log('URL de mise à jour RH (JSON):', url);
    
    // Utilisez getHeaders() pour définir le Content-Type: application/json
    return this.http.put<any>(url, userData, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getRhById(id: number): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    console.log('URL pour récupérer les détails du RH:', url);
    return this.http.get<any>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Ajoutez ces méthodes à votre userService.ts existant

  getStagiaireById(id: number): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    console.log('URL pour récupérer les détails du stagiaire:', url);
    return this.http.get<any>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateStagiaireJson(id: number, userData: any): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    console.log('URL de mise à jour Stagiaire (JSON):', url);
    
    return this.http.put<any>(url, userData, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getTuteurById(id: number): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    console.log('URL pour récupérer les détails du tuteur:', url);
    return this.http.get<any>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateTuteurJson(id: number, userData: any): Observable<any> {
    const url = `${this.apiUrl}/${id}`;
    console.log('URL de mise à jour Tuteur (JSON):', url);
    
    return this.http.put<any>(url, userData, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getStagiairesByTuteur(tuteurId: number): Observable<any[]> {
    const url = `${this.apiUrl}/tuteur/${tuteurId}/stagiaires`;
    console.log('URL pour récupérer les stagiaires du tuteur:', url);
    return this.http.get<any[]>(url, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Récupérer les stagiaires sans tuteur
  getStagiairesSansTuteur(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stagiaires/sans-tuteur`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Affecter des stagiaires à un tuteur
  affecterStagiaires(tuteurId: number, stagiaireIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tuteur/${tuteurId}/stagiaires`, stagiaireIds, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Retirer un stagiaire d'un tuteur
  retirerStagiaire(stagiaireId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/stagiaires/${stagiaireId}/tuteur`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getUsersByRole(role: string): Observable<any[]> {
    console.log(`Appel à getUsersByRole avec role=${role}`);
    return this.http.get<any[]>(`${environment.apiUrl}/api/users/role/${role}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Réponse de getUsersByRole:', response)),
        catchError(error => {
          console.error('Erreur détaillée dans getUsersByRole:', error);
          return throwError(() => error);
        })
      );
  }

  updateStagiaireFormData(id: number, formData: FormData): Observable<any> {
    const url = `${this.apiUrl}/${id}/form`;
    console.log('URL de mise à jour Stagiaire (FormData):', url);
    
    // Pas besoin d'ajouter les en-têtes Content-Type, ils seront automatiquement définis
    return this.http.put<any>(url, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap(response => console.log('Réponse de mise à jour FormData:', response)),
        catchError(this.handleError)
      );
  }

  // Méthode pour mise à jour partielle des tuteurs avec FormData
  updateTuteurFormData(id: number, formData: FormData): Observable<any> {
    const url = `${this.apiUrl}/${id}/form`;
    console.log('URL de mise à jour Tuteur (FormData):', url);
    
    // Pas besoin d'ajouter les en-têtes Content-Type, ils seront automatiquement définis
    return this.http.put<any>(url, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap(response => console.log('Réponse de mise à jour FormData:', response)),
        catchError(this.handleError)
      );
  }

  // Méthode pour mise à jour partielle des RH avec FormData
  updateRhFormData(id: number, formData: FormData): Observable<any> {
    const url = `${this.apiUrl}/${id}/form`;
    console.log('URL de mise à jour RH (FormData):', url);
    
    // Pas besoin d'ajouter les en-têtes Content-Type, ils seront automatiquement définis
    return this.http.put<any>(url, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap(response => console.log('Réponse de mise à jour FormData:', response)),
        catchError(this.handleError)
      );
  }

  verifyCurrentPassword(userId: number, currentPassword: string): Observable<boolean> {
    const url = `${this.apiUrl}/verify-password`;
    return this.http.post<boolean>(url, { userId, currentPassword }, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la vérification du mot de passe:', error);
          return of(false); // En cas d'erreur, considérer que le mot de passe est invalide
        })
      );
  }

  /**
   * Récupère les statistiques globales des utilisateurs
   * REMARQUE: Utilise des données statiques temporaires jusqu'à ce que l'API backend soit implémentée
   */
  getUserStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, using mock data for user statistics');
          // Données temporaires
          return of({
            totalUsers: 156,
            tuteurs: 18,
            stagiaires: 124,
            newRequests: 14
          });
        })
      );
  }

  /**
   * Récupère les utilisateurs récemment inscrits
   * @param limit Nombre maximum d'utilisateurs à récupérer
   * REMARQUE: Utilise des données statiques temporaires jusqu'à ce que l'API backend soit implémentée
   */
  getRecentUsers(limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recent?limit=${limit}`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, using mock data for recent users');
          // Données temporaires
          return of([
            { id: 1, firstName: 'Ahmed', lastName: 'Ben Ali', username: 'ahmedba', timestamp: 'Il y a 2 heures', profilePictureUrl: null },
            { id: 2, firstName: 'Sarra', lastName: 'Hadj', username: 'sarrah', timestamp: 'Il y a 5 heures', profilePictureUrl: null },
            { id: 3, firstName: 'Mohamed', lastName: 'Trabelsi', username: 'mohamedt', timestamp: 'Il y a 1 jour', profilePictureUrl: null },
            { id: 4, firstName: 'Fatma', lastName: 'Salhi', username: 'fatmas', timestamp: 'Il y a 2 jours', profilePictureUrl: null }
          ]);
        })
      );
  }

  /**
   * Récupère les demandes d'inscription en attente
   * REMARQUE: Utilise des données statiques temporaires jusqu'à ce que l'API backend soit implémentée
   */
  getPendingRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pending-requests`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, using mock data for pending requests');
          // Données temporaires
          return of([
            { id: 5, firstName: 'Yassine', lastName: 'Mejri', username: 'yassinem', requestType: 'Activation Compte', profilePictureUrl: null },
            { id: 6, firstName: 'Imen', lastName: 'Cherif', username: 'imenc', requestType: 'Activation Compte', profilePictureUrl: null },
            { id: 7, firstName: 'Hichem', lastName: 'Kaabi', username: 'hichemk', requestType: 'Activation Compte', profilePictureUrl: null }
          ]);
        })
      );
  }

  /**
   * Approuve une demande d'inscription
   * @param requestId ID de la demande à approuver
   */
  approveRequest(requestId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/approve-request/${requestId}`, {}, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, mocking approval');
          // Simuler une réponse positive
          return of({ success: true, message: 'Demande approuvée avec succès' });
        })
      );
  }

  /**
   * Rejette une demande d'inscription
   * @param requestId ID de la demande à rejeter
   */
  rejectRequest(requestId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reject-request/${requestId}`, {}, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, mocking rejection');
          // Simuler une réponse positive
          return of({ success: true, message: 'Demande rejetée avec succès' });
        })
      );
  }

  // Dans UserService (paste-4.txt), modifiez cette méthode
  getTuteurStats(tuteurId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tuteur/${tuteurId}/stats`, { headers: this.getHeaders() })
      .pipe(
        // Ne gardez pas le fallback pour les vraies données
        catchError(error => {
          console.error('Erreur lors de la récupération des statistiques tuteur:', error);
          throw error; // Propager l'erreur pour la gérer dans le composant
        })
      );
  }

  /**
   * Récupère les activités récentes pour un utilisateur
   * @param userId ID de l'utilisateur
   */
  getRecentActivities(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}/activities`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, using mock data for recent activities');
          // Données temporaires
          return of([
            { text: "Rapport validé", time: "Il y a 2 heures", type: "completion" },
            { text: "Nouveau message", time: "Il y a 5 heures", type: "message" },
            { text: "Nouveau stagiaire", time: "Il y a 1 jour", type: "user" },
            { text: "Document soumis", time: "Il y a 2 jours", type: "document" }
          ]);
        })
      );
  }

  // Ajoutez ces méthodes à votre UserService existant

  /**
   * Récupère les utilisateurs avec qui l'utilisateur connecté peut programmer des meetings
   * @param currentUserId ID de l'utilisateur connecté
   * @param currentUserRole Rôle de l'utilisateur connecté
   */
  getAvailableUsersForMeetings(currentUserId: number, currentUserRole: string): Observable<any[]> {
    const headers = this.getHeaders();
    
    switch (currentUserRole) {
      case 'RH':
        // RH peut programmer avec tout le monde sauf lui-même
        return this.getAllUsers().pipe(
          map(users => users.filter(user => user.id !== currentUserId))
        );
      
      case 'Tuteur':
        // Tuteur peut programmer avec ses stagiaires et les RH
        return this.getStagiairesByTuteur(currentUserId).pipe(
          switchMap(stagiaires => {
            return this.getAllRH().pipe(
              map(rhUsers => [...stagiaires, ...rhUsers])
            );
          }),
          catchError(error => {
            console.error('Erreur lors de la récupération des utilisateurs pour tuteur:', error);
            // En cas d'erreur, retourner tous les stagiaires et RH
            return this.getUsersByRole('Stagiaire').pipe(
              switchMap(stagiaires => {
                return this.getAllRH().pipe(
                  map(rhUsers => [...stagiaires, ...rhUsers])
                );
              })
            );
          })
        );
      
      case 'Stagiaire':
        // Stagiaire peut programmer avec son tuteur et les RH
        return this.getTuteurForStagiaire(currentUserId).pipe(
          switchMap(tuteur => {
            return this.getAllRH().pipe(
              map(rhUsers => tuteur ? [tuteur, ...rhUsers] : rhUsers)
            );
          }),
          catchError(error => {
            console.error('Erreur lors de la récupération des utilisateurs pour stagiaire:', error);
            // En cas d'erreur, retourner tous les tuteurs et RH
            return this.getUsersByRole('Tuteur').pipe(
              switchMap(tuteurs => {
                return this.getAllRH().pipe(
                  map(rhUsers => [...tuteurs, ...rhUsers])
                );
              })
            );
          })
        );
      
      default:
        // Par défaut, retourner tous les utilisateurs sauf l'utilisateur connecté
        return this.getAllUsers().pipe(
          map(users => users.filter(user => user.id !== currentUserId))
        );
    }
  }

  /**
   * Récupère les utilisateurs selon leur rôle avec gestion d'erreur améliorée
   * @param role Rôle des utilisateurs à récupérer
   */
  getUsersByRoleForMeetings(role: string): Observable<any[]> {
    console.log(`Récupération des utilisateurs avec le rôle: ${role}`);
    
    return this.getUsersByRole(role).pipe(
      catchError(error => {
        console.error(`Erreur lors de la récupération des utilisateurs ${role}:`, error);
        return of([]); // Retourner un tableau vide en cas d'erreur
      })
    );
  }

  /**
   * Récupère les statistiques des meetings pour un utilisateur
   * @param userId ID de l'utilisateur
   */
  getUserMeetingStats(userId: number): Observable<any> {
    const url = `${this.apiUrl}/${userId}/meeting-stats`;
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.log('API endpoint not implemented yet, using mock data for meeting stats');
          // Données temporaires pour les statistiques de meetings
          return of({
            totalMeetings: 12,
            upcomingMeetings: 3,
            completedMeetings: 8,
            cancelledMeetings: 1,
            meetingsThisWeek: 2,
            averageMeetingDuration: 45
          });
        })
      );
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE : Récupère le tuteur assigné à un stagiaire
   */
  getTuteurForStagiaire(stagiaireId: number): Observable<any | null> {
    const url = `${this.apiUrl}/stagiaire/${stagiaireId}/tuteur`;
    console.log('🔍 URL pour récupérer le tuteur du stagiaire:', url);
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        tap(tuteur => {
          if (tuteur) {
            console.log(`👨‍🏫 Tuteur trouvé pour le stagiaire ${stagiaireId}:`, `${tuteur.firstName} ${tuteur.lastName}`);
          } else {
            console.log(`⚠️ Aucun tuteur assigné pour le stagiaire ${stagiaireId}`);
          }
        }),
        catchError(error => {
          console.error('❌ Erreur lors de la récupération du tuteur:', error);
          return of(null); // Retourner null si pas de tuteur trouvé
        })
      );
  }

  /**
   * 🔐 VALIDATION : Vérifie si un utilisateur peut programmer un meeting avec un autre utilisateur
   */
  canScheduleMeetingWith(organizerId: number, participantId: number, organizerRole: string): Observable<boolean> {
    console.log(`🔒 Vérification des permissions: ${organizerRole} (${organizerId}) → Participant (${participantId})`);
    
    switch (organizerRole) {
      case 'RH':
        console.log('✅ RH peut programmer avec tout le monde');
        return of(true);
        
      case 'Tuteur':
        console.log('🎓 Vérification si le participant est un stagiaire du tuteur...');
        return this.getStagiairesByTuteur(organizerId).pipe(
          map(stagiaires => {
            const isAllowed = stagiaires.some(s => s.id === participantId);
            console.log(isAllowed ? '✅ Participant autorisé' : '❌ Participant non autorisé');
            return isAllowed;
          })
        );
        
      case 'Stagiaire':
        console.log('🎒 Vérification si le participant est le tuteur ou un RH...');
        return this.getTuteurForStagiaire(organizerId).pipe(
          switchMap(tuteur => {
            if (tuteur && tuteur.id === participantId) {
              console.log('✅ Le participant est le tuteur du stagiaire');
              return of(true);
            }
            return this.getAllRH().pipe(
              map(rhUsers => {
                const isRH = rhUsers.some(rh => rh.id === participantId);
                console.log(isRH ? '✅ Le participant est un RH' : '❌ Le participant n\'est ni le tuteur ni un RH');
                return isRH;
              })
            );
          })
        );
        
      default:
        console.log('❌ Rôle non reconnu, accès refusé');
        return of(false);
    }
  }

  // ===== NOUVELLES MÉTHODES POUR SKILLS ET CV =====

  /**
   * 📝 Récupère les informations CV et compétences d'un utilisateur
   * @param userId ID de l'utilisateur
   */
  getUserCvInfo(userId: number): Observable<any> {
    const url = `${this.apiUrl}/${userId}/cv-info`;
    console.log('📝 Récupération des infos CV pour l\'utilisateur:', userId);
    
    return this.http.get<any>(url, { headers: this.getHeaders() })
      .pipe(
        tap(cvInfo => console.log('✅ Infos CV récupérées:', cvInfo)),
        catchError(error => {
          console.error('❌ Erreur lors de la récupération des infos CV:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * 🎯 Met à jour les compétences d'un utilisateur
   * @param userId ID de l'utilisateur
   * @param skills Compétences (string)
   */
  updateUserSkills(userId: number, skills: string): Observable<any> {
    const url = `${this.apiUrl}/${userId}/skills-simple`;
    console.log('🎯 Mise à jour des compétences pour l\'utilisateur:', userId);
    
    return this.http.put<any>(url, JSON.stringify(skills), { 
      headers: this.getHeaders().set('Content-Type', 'application/json') 
    })
      .pipe(
        tap(response => console.log('✅ Compétences mises à jour:', response)),
        catchError(error => {
          console.error('❌ Erreur lors de la mise à jour des compétences:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * 📄 Upload du CV pour un utilisateur
   * @param userId ID de l'utilisateur
   * @param cvFile Fichier CV
   */
  uploadUserCv(userId: number, cvFile: File): Observable<any> {
    const url = `${this.apiUrl}/${userId}/cv`;
    console.log('📄 Upload du CV pour l\'utilisateur:', userId);
    
    const formData = new FormData();
    formData.append('cvFile', cvFile);
    
    return this.http.post<any>(url, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap(response => console.log('✅ CV uploadé avec succès:', response)),
        catchError(error => {
          console.error('❌ Erreur lors de l\'upload du CV:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * 🗑️ Supprime le CV d'un utilisateur
   * @param userId ID de l'utilisateur
   */
  deleteUserCv(userId: number): Observable<any> {
    const url = `${this.apiUrl}/${userId}/cv`;
    console.log('🗑️ Suppression du CV pour l\'utilisateur:', userId);
    
    return this.http.delete<any>(url, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('✅ CV supprimé avec succès:', response)),
        catchError(error => {
          console.error('❌ Erreur lors de la suppression du CV:', error);
          return throwError(() => error);
        })
      );
  }

 /**
 * 📥 Télécharge le CV d'un utilisateur
 * @param userId ID de l'utilisateur
 */
downloadUserCv(userId: number): Observable<Blob> {
  const url = `${this.apiUrl}/${userId}/cv/download`;
  console.log('📥 URL de téléchargement du CV:', url);
  
  // Headers pour l'authentification mais sans Content-Type
  let headers = new HttpHeaders();
  if (this.isBrowser) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
  }
  
  return this.http.get(url, { 
    headers: headers,
    responseType: 'blob',  // TRÈS IMPORTANT : spécifier le type de réponse comme blob
    observe: 'body'        // Observer seulement le body de la réponse
  })
    .pipe(
      tap((blob: Blob) => {
        console.log('✅ CV téléchargé avec succès');
        console.log('📊 Taille du blob:', blob.size);
        console.log('📄 Type MIME:', blob.type);
      }),
      catchError(error => {
        console.error('❌ Erreur lors du téléchargement du CV:', error);
        
        // Si l'erreur est un blob (erreur du serveur), essayer de la lire
        if (error.error instanceof Blob) {
          return new Promise<never>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const errorText = reader.result as string;
              console.error('📄 Contenu de l\'erreur:', errorText);
              reject(new Error(`Erreur serveur: ${errorText}`));
            };
            reader.readAsText(error.error);
          });
        }
        
        return throwError(() => error);
      })
    );
}

  /**
   * 🔄 Met à jour le profil complet (Skills + CV) en une seule requête
   * @param userId ID de l'utilisateur
   * @param skills Compétences (optionnel)
   * @param cvFile Fichier CV (optionnel)
   */
  updateCompleteProfile(userId: number, skills?: string, cvFile?: File): Observable<any> {
    const url = `${this.apiUrl}/${userId}/profile-complete`;
    console.log('🔄 Mise à jour complète du profil pour l\'utilisateur:', userId);
    
    const formData = new FormData();
    
    if (skills) {
      formData.append('skills', skills);
    }
    
    if (cvFile) {
      formData.append('cvFile', cvFile);
    }
    
    return this.http.put<any>(url, formData, { headers: this.getMultipartHeaders() })
      .pipe(
        tap(response => console.log('✅ Profil complet mis à jour:', response)),
        catchError(error => {
          console.error('❌ Erreur lors de la mise à jour du profil complet:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * 📊 Vérifie si un utilisateur peut avoir des compétences et un CV
   * @param userRole Rôle de l'utilisateur
   */
  canHaveSkillsAndCv(userRole: string): boolean {
    return userRole === 'Stagiaire' || userRole === 'Tuteur';
  }

  /**
   * 🔍 Valide un fichier CV avant upload
   * @param file Fichier à valider
   */
  validateCvFile(file: File): { valid: boolean; error?: string } {
    // Vérifier la présence du fichier
    if (!file) {
      return { valid: false, error: 'Aucun fichier sélectionné' };
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Le fichier ne peut pas dépasser 5MB' };
    }

    // Vérifier le type de fichier
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      return { valid: false, error: 'Format non supporté. Utilisez PDF, DOC ou DOCX' };
    }

    return { valid: true };
  }

  /**
   * 🎨 Formate les compétences pour l'affichage
   * @param skills String de compétences séparées par des virgules
   */
  formatSkills(skills: string): string[] {
    if (!skills) return [];
    return skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
  }

  /**
   * 🔗 Génère l'URL complète pour un fichier CV
   * @param cvUrl URL relative du CV
   */
  getCvUrl(cvUrl: string): string {
    if (!cvUrl) return '';
    if (cvUrl.startsWith('http')) return cvUrl;
    return `${environment.apiUrl}/${cvUrl.replace(/^\//, '')}`;
  }

  /**
 * 🎯 Récupère tous les stagiaires qui ne sont affectés à aucun projet
 */
getUnassignedStagiaires(): Observable<any[]> {
  console.log('🔍 Récupération des stagiaires non affectés...');
  return this.http.get<any[]>(`${this.apiUrl}/stagiaires/unassigned`, { headers: this.getHeaders() })
    .pipe(
      tap(stagiaires => {
        console.log(`✅ ${stagiaires.length} stagiaires non affectés récupérés`);
        stagiaires.forEach(s => console.log(`- ${s.firstName} ${s.lastName} (ID: ${s.id})`));
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des stagiaires non affectés:', error);
        return throwError(() => error);
      })
    );
}

/**
 * 🎯 Récupère tous les stagiaires disponibles pour être affectés à un projet spécifique
 * @param projectId ID du projet
 */
getStagiairesAvailableForProject(projectId: number): Observable<any[]> {
  console.log(`🔍 Récupération des stagiaires disponibles pour le projet ${projectId}...`);
  return this.http.get<any[]>(`${this.apiUrl}/stagiaires/available-for-project/${projectId}`, { headers: this.getHeaders() })
    .pipe(
      tap(stagiaires => {
        console.log(`✅ ${stagiaires.length} stagiaires disponibles pour le projet ${projectId}`);
        stagiaires.forEach(s => console.log(`- ${s.firstName} ${s.lastName} (ID: ${s.id})`));
      }),
      catchError(error => {
        console.error(`❌ Erreur lors de la récupération des stagiaires pour le projet ${projectId}:`, error);
        return throwError(() => error);
      })
    );
}

/**
 * 🔍 Récupère tous les stagiaires (pour comparaison/debug)
 */
getAllStagiairesForComparison(): Observable<any[]> {
  console.log('🔍 Récupération de TOUS les stagiaires (pour comparaison)...');
  return this.getUsersByRole('Stagiaire').pipe(
    tap(stagiaires => {
      console.log(`📊 Total de tous les stagiaires dans le système: ${stagiaires.length}`);
      stagiaires.forEach(s => console.log(`- ${s.firstName} ${s.lastName} (ID: ${s.id})`));
    })
  );
}
}