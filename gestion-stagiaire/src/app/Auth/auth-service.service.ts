import { Injectable, Inject, PLATFORM_ID  } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError,of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { Department } from '../components/models/user';
import { SocialAuthService, GoogleLoginProvider,SocialUser } from '@abacritt/angularx-social-login';
import { NotificationService } from '../services/Notification/notification.service';
// Interface pour la réponse d'authentification
interface AuthResponse {
  token: string;
  user: any; // Adaptez le type selon votre API
  expiresIn: number;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: any;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/Users`;
  
  private currentUserSubject: BehaviorSubject<any | null>;
  public currentUser: Observable<any | null>;
  private isBrowser: boolean;
  //private socialAuthService = Inject(SocialAuthService);
 // private platformId = inject(PLATFORM_ID);

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any,
    private socialAuthService: SocialAuthService,
    private notificationService: NotificationService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    let storedUser = null;
    
    if (this.isBrowser) {
      storedUser = localStorage.getItem('currentUser');
    }
    
    try {
      // Vérifier si storedUser existe et n'est pas la chaîne "undefined"
      this.currentUserSubject = new BehaviorSubject<any | null>(
        storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) : null
      );
    } catch (error) {
      // En cas d'erreur de parsing, initialiser avec null et nettoyer le localStorage
      console.error('Erreur lors du chargement des données utilisateur:', error);
      if (this.isBrowser) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('auth_token');
      }
      this.currentUserSubject = new BehaviorSubject<any | null>(null);
    }
    
    this.currentUser = this.currentUserSubject.asObservable();

    if (this.isBrowser) {
      // S'abonner aux événements d'authentification sociale
      this.socialAuthService.authState.subscribe((user: SocialUser) => {
        if (user) {
          console.log('Utilisateur Google connecté :', user);
          this.loginWithGoogle(user.idToken);
        }
      });
    }
  }


// Méthode pour se connecter avec Google
// Dans auth.service.ts
loginWithGoogle(idToken: string): Observable<any> {
  console.log('Sending Google token to backend, length:', idToken?.length || 0);
  
  const payload = {
    provider: 'google',
    idToken: idToken
  };
  
  return this.http.post<any>(`${this.apiUrl}/external-login-simple`, payload)
    .pipe(
      tap(response => {
        console.log('Backend response for Google login:', response);
        
        if (response && response.token) {
          if (this.isBrowser) {
            // Store the auth token
            localStorage.setItem('auth_token', response.token);
            
            // Extract user info from token
            try {
              const tokenParts = response.token.split('.');
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                
                // Create a user object
                const user = {
                  id: payload.nameid || payload.sub,
                  username: payload.unique_name || payload.name || payload.email?.split('@')[0],
                  email: payload.email,
                  role: payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
                };
                
                console.log('User extracted from token:', user);
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.currentUserSubject.next(user);
              }
            } catch (error) {
              console.error('Error parsing token:', error);
            }
          }
        }
      }),
      catchError(error => {
        console.error('Google login error:', error);
        return throwError(() => new Error('Erreur lors de la connexion avec Google: ' + (error.message || error.error?.message || 'Erreur inconnue')));
      })
    );
}

  signInWithGoogle(): void {
    if (this.isBrowser) {
      this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
    }
  }

  // Getter pour accéder facilement à l'utilisateur connecté
  public get currentUserValue(): any | null {
    return this.currentUserSubject.value;
  }
    

  public refreshUserData(): void {
    if (this.isBrowser) {
      const storedUser = localStorage.getItem('currentUser');
      const token = localStorage.getItem('auth_token');
      
      console.log('RefreshUserData: Tentative de restauration des données utilisateur');
      console.log('RefreshUserData: Token présent?', !!token);
      console.log('RefreshUserData: User stocké?', !!storedUser);
      
      // Si on a un utilisateur stocké, on l'utilise
      if (storedUser && storedUser !== "undefined") {
        try {
          const user = JSON.parse(storedUser);
          console.log('RefreshUserData: Utilisateur récupéré du localStorage', user);
          
          // Mettre à jour le BehaviorSubject
          this.currentUserSubject.next(user);
        } catch (error) {
          console.error('RefreshUserData: Erreur parsing storedUser', error);
          
          // Si erreur de parsing, nettoyer le localStorage mais conserver le token
          localStorage.removeItem('currentUser');
          
          // Essayer de reconstruire l'utilisateur à partir du token
          if (token) {
            this.reconstructUserFromToken(token);
          }
        }
      } 
      // Si on n'a pas d'utilisateur mais qu'on a un token, essayer de reconstruire
      else if (token) {
        this.reconstructUserFromToken(token);
      }
    }
  }
  // Nouvelle méthode pour reconstruire un utilisateur minimal à partir du token
private reconstructUserFromToken(token: string): void {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    console.log('Token payload:', payload);
    
    // Reconstruire un utilisateur minimal à partir des claims du token
    const user = {
      id: payload.nameid || payload.sub,
      username: payload.unique_name || payload.name,
      email: payload.email,
      role: payload.role || 'User' // Rôle par défaut si non précisé
    };
    
    console.log('Utilisateur reconstruit à partir du token:', user);
    
    // Sauvegarder l'utilisateur reconstruit
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  } catch (error) {
    console.error('Erreur lors de la reconstruction de l\'utilisateur:', error);
  }
}

  

login(username: string, password: string): Observable<AuthResponse> {
  return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { usernameOrEmail: username, password })
  .pipe(
    map(response => {
      if (!response || !response.token) {
        throw new Error('Réponse invalide du serveur');
      }
      
      // Reconstruire les informations utilisateur à partir du token
      const token = response.token;
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Créer un objet utilisateur à partir des claims du token
        const user = {
          id: payload.nameid || payload.sub,
          username: payload.unique_name || payload.name,
          email: payload.email,
          role: payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        };
        
        // Ajouter l'objet user à la réponse
        response.user = user;
        
        // Stocker dans le localStorage
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('auth_token', response.token);
        }
        
        // Mettre à jour le BehaviorSubject
        this.currentUserSubject.next(user);
      }
      
      return response;
    }),
    catchError((error: HttpErrorResponse) => {
      console.error('Erreur de connexion détaillée:', error);
      return throwError(() => new Error(error.error?.message || error.message || 'Erreur lors de la connexion'));
    })
  );
}

  logout(): void {
    // Supprime l'utilisateur et le token du localStorage
    if (this.isBrowser) {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
    }
    // Remet le BehaviorSubject à null
    this.currentUserSubject.next(null);
    
    // Redirection vers la page de login
    this.router.navigate(['/login']);
  }

  // Vérifie si l'utilisateur a un rôle spécifique
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user !== null && user.role === role;
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;
    
    const hasToken = !!localStorage.getItem('auth_token');
    const hasUser = !!this.currentUserValue;
    
    console.log('isAuthenticated: hasToken', hasToken);
    console.log('isAuthenticated: hasUser', hasUser);
    
    // Si on a un token mais pas d'utilisateur, essayons de charger l'utilisateur à partir du localStorage
    if (hasToken && !hasUser) {
      console.log('isAuthenticated: tentative de récupération de l\'utilisateur depuis localStorage');
      const storedUser = localStorage.getItem('currentUser');
      
      if (storedUser && storedUser !== "undefined") {
        try {
          const user = JSON.parse(storedUser);
          console.log('isAuthenticated: utilisateur récupéré du localStorage', user);
          
          // Met à jour le BehaviorSubject avec l'utilisateur récupéré
          this.currentUserSubject.next(user);
          
          return true;
        } catch (error) {
          console.error('isAuthenticated: erreur lors de la récupération de l\'utilisateur', error);
        }
      }
    }
    
    return hasToken && hasUser;
  }

  isTokenExpired(): boolean {
    if (!this.isBrowser) return true;
    
    const token = localStorage.getItem('auth_token');
    console.log('isTokenExpired: Token présent?', !!token);
    
    if (!token) return true;
    
    try {
      // Décode le token JWT (les tokens JWT ont 3 parties séparées par des points)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('isTokenExpired: Format de token invalide');
        return true;
      }
      
      // Décode la partie payload du token (2ème partie)
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      console.log('isTokenExpired: Payload du token', tokenPayload);
      
      // Vérifie si le token contient une date d'expiration
      if (!tokenPayload.exp) {
        console.log('isTokenExpired: Token sans date d\'expiration');
        return false; // Si pas de date d'expiration, considérer comme valide
      }
      
      // Vérifie la date d'expiration (exp est en secondes depuis epoch)
      const expiryTime = tokenPayload.exp * 1000; // Convertit en millisecondes
      const now = Date.now();
      const isExpired = now >= expiryTime;
      
      console.log('isTokenExpired: Date expiration', new Date(expiryTime));
      console.log('isTokenExpired: Date actuelle', new Date(now));
      console.log('isTokenExpired: Token expiré?', isExpired);
      
      return isExpired;
    } catch (error) {
      console.error('isTokenExpired: Erreur lors de la vérification du token', error);
      return true; // Si une erreur se produit, considère le token comme expiré
    }
  }
  
  register(username: string, email: string, password: string): Observable<RegisterResponse> {
    const registerData: RegisterRequest = {
      username,
      email,
      password
    };
  
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, registerData)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur d\'enregistrement:', error);
          return throwError(() => new Error(error.error?.message || 'Erreur lors de l\'enregistrement'));
        })
      );
  }
  
registerWithFormData(formData: FormData): Observable<any> {
  console.log('Envoi du formulaire multipart...');
  
  return this.http.post<any>(`${this.apiUrl}/register`, formData)
    .pipe(
      tap(response => {
        console.log('Réponse d\'enregistrement:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('=== ERREUR DANS LE SERVICE ===');
        console.error('Erreur complète:', error);
        console.log('error.error:', error.error);
        console.log('error.status:', error.status);
        
        // Extraire le vrai message d'erreur du serveur
        let errorMessage = 'Erreur lors de l\'enregistrement';
        
        // Récupérer le message depuis la réponse HTTP originale
        if (error.error) {
          if (typeof error.error === 'object' && error.error.message) {
            errorMessage = error.error.message;
            console.log('=== MESSAGE EXTRAIT DE error.error.message:', errorMessage);
          } else if (typeof error.error === 'string') {
            try {
              const parsed = JSON.parse(error.error);
              if (parsed.message) {
                errorMessage = parsed.message;
                console.log('=== MESSAGE EXTRAIT APRÈS PARSING:', errorMessage);
              }
            } catch {
              errorMessage = error.error;
              console.log('=== MESSAGE EXTRAIT COMME STRING:', errorMessage);
            }
          }
        }
        
        // Si on n'a toujours pas le bon message, essayer d'autres propriétés
        if (errorMessage === 'Erreur lors de l\'enregistrement' || errorMessage === 'Requête incorrecte') {
          // Essayer de récupérer depuis headers ou autres propriétés
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
            console.log('=== MESSAGE EXTRAIT DE error.error.error:', errorMessage);
          }
        }
        
        console.log('=== MESSAGE FINAL À RETOURNER:', errorMessage);
        
        // Retourner l'erreur avec le message du serveur
        return throwError(() => ({ 
          message: errorMessage,
          status: error.status,
          originalError: error
        }));
      })
    );
}

  
  
  // Méthode séparée pour l'upload de l'image de profil (si nécessaire ultérieurement)
  uploadProfilePicture(userId: string, profilePicture: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', profilePicture);
    
    return this.http.post<any>(`${this.apiUrl}/${userId}/profile-picture`, formData)
      .pipe(
        tap(response => console.log('Image de profil uploadée:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors de l\'upload de l\'image:', error);
          return throwError(() => new Error(error.error?.message || 'Erreur lors de l\'upload de l\'image'));
        })
      );
  }

  testGoogleToken(idToken: string): Observable<any> {
    console.log('Test d\'envoi du token au backend');
    
    return this.http.post<any>(`${this.apiUrl}/test-token`, {
      provider: 'google',
      idToken: idToken
    }).pipe(
      tap(response => console.log('Réponse du test:', response)),
      catchError(error => {
        console.error('Erreur du test:', error);
        return throwError(() => new Error('Erreur lors du test'));
      })
    );
  }

  loginWithGoogleSimple(idToken: string): Observable<any> {
    console.log('Envoi du token Google au backend (méthode simplifiée)');
    
    return this.http.post<any>(`${this.apiUrl}/external-login-simple`, {
      provider: 'google',
      idToken: idToken
    }).pipe(
      tap(response => {
        console.log('Réponse d\'authentification:', response);
        
        if (response && response.token) {
          if (this.isBrowser) {
            // Si une info utilisateur est présente, la sauvegarder
            if (response.user) {
              localStorage.setItem('currentUser', JSON.stringify(response.user));
              this.currentUserSubject.next(response.user);
            } else {
              // Sinon, reconstruire un utilisateur minimal à partir du token
              const decodedToken = this.reconstructUserFromToken(response.token);
              localStorage.setItem('currentUser', JSON.stringify(decodedToken));
              this.currentUserSubject.next(decodedToken);
            }
            
            localStorage.setItem('auth_token', response.token);
          }
        }
      }),
      catchError(error => {
        console.error('Erreur lors de la connexion simplifiée:', error);
        return throwError(() => new Error('Erreur lors de la connexion avec Google (méthode simplifiée)'));
      })
    );
  }
// Ajoutez cette méthode à votre auth.service.ts
// Ajoutez cette méthode à votre auth.service.ts
loginWithGoogleDirect(credential: string): Observable<any> {
  console.log('Connexion Google directe (sans backend)');
  
  try {
    // Découper le token JWT
    const tokenParts = credential.split('.');
    if (tokenParts.length !== 3) {
      return throwError(() => new Error('Format de token invalide'));
    }
    
    // Décoder le payload
    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    // Extraire les informations du token
    const payload = JSON.parse(jsonPayload);
    console.log('Payload du token Google:', payload);
    
    // Créer un objet d'utilisateur fictif
    const user = {
      id: 0,  // ID temporaire
      username: payload.email.split('@')[0],
      email: payload.email,
      firstName: payload.given_name || payload.email.split('@')[0],
      lastName: payload.family_name || '',
      role: 'Stagiaire', // Rôle par défaut
      profilePictureUrl: payload.picture || null
    };
    
    // Créer un token JWT fictif
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1); // Token valide pour 1h
    
    const mockResult = {
      token: credential, // On utilise le token Google directement
      user: user,
      expiration: expirationDate.toISOString()
    };
    
    // Sauvegarder dans le localStorage
    if (this.isBrowser) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('auth_token', credential);
      this.currentUserSubject.next(user);
    }
    
    return of(mockResult);
  } catch (error: any) { // Spécifiez le type comme 'any'
    console.error('Erreur lors du traitement du token Google:', error);
    return throwError(() => new Error('Erreur lors du traitement du token: ' + (error.message || 'Erreur inconnue')));
  }
}

forgotPassword(email: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email })
    .pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur lors de la demande de réinitialisation:', error);
        return throwError(() => new Error(error.error?.message || 'Erreur lors de la demande de réinitialisation'));
      })
    );
}

// Méthode pour réinitialiser le mot de passe
resetPassword(token: string, email: string, newPassword: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/reset-password`, { 
    token, 
    email, 
    newPassword 
  })
  .pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      return throwError(() => new Error(error.error?.message || 'Erreur lors de la réinitialisation du mot de passe'));
    })
  );
}

getCurrentUser(): Observable<any> {
  return this.currentUser;
}

}