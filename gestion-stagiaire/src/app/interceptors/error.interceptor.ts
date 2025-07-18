import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const platformId = inject(PLATFORM_ID);
  
  // Vérifier si nous sommes dans un navigateur
  if (isPlatformBrowser(platformId)) {
    // Récupérer le token depuis localStorage (seulement côté navigateur)
    const token = localStorage.getItem('auth_token');
    
    // Si le token existe, ajouter l'en-tête d'autorisation
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }
  
  return next(req);
};

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Pour les requêtes de registration, laisser passer l'erreur originale avec le message du serveur
      if (req.url.includes('/register')) {
        console.log('=== INTERCEPTOR: Requête de registration détectée ===');
        console.log('Erreur originale:', error);
        console.log('Message du serveur:', error.error?.message);
        
        // Retourner l'erreur originale sans la transformer
        return throwError(() => error);
      }
      
      let errorMessage = 'Une erreur est survenue';
      
      if (error.error instanceof ErrorEvent) {
        // Erreur côté client
        errorMessage = `Erreur: ${error.error.message}`;
      } else {
        // Erreur côté serveur - mais d'abord vérifier si le serveur a fourni un message spécifique
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else {
          // Sinon, utiliser les messages génériques selon le code de statut
          switch (error.status) {
            case 400:
              errorMessage = 'Requête incorrecte';
              break;
            case 401:
              errorMessage = 'Non autorisé';
              // Vider le localStorage et rediriger seulement côté navigateur
              if (isPlatformBrowser(platformId)) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('currentUser');
              }
              break;
            case 403:
              errorMessage = 'Accès interdit';
              break;
            case 404:
              errorMessage = 'Ressource non trouvée';
              break;
            case 500:
              errorMessage = 'Erreur interne du serveur';
              break;
            default:
              errorMessage = `Une erreur est survenue (Code: ${error.status})`;
              break;
          }
        }
      }
      
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
};