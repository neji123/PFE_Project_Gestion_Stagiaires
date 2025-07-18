// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Auth/auth-service.service'; 

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  console.log('AuthGuard: vérification de l\'authentification');
  
  // Vérification manuelle du token et tentative de récupération de l'utilisateur
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    console.log('AuthGuard: Token présent, tentative de restauration utilisateur');
    
    // Forcer la récupération des données utilisateur si besoin
    if (!authService.currentUserValue) {
      authService.refreshUserData();
    }
    
    // Autoriser l'accès même si currentUserValue est null tant que le token est présent
    return true;
  }
  
  console.log('AuthGuard: Token absent, redirection vers login');
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};