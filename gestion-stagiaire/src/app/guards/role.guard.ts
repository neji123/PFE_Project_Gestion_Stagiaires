// src/app/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Auth/auth-service.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Récupère les rôles autorisés des données de la route
  const allowedRoles = route.data?.['roles'] as string[];
  
  if (!allowedRoles || allowedRoles.length === 0) {
    return true; // Si aucun rôle n'est requis, autoriser l'accès
  }
  
  const currentUser = authService.currentUserValue;
  
  // Vérifie si l'utilisateur connecté a l'un des rôles requis
  if (currentUser && allowedRoles.includes(currentUser.role)) {
    return true;
  }
  
  // Non autorisé, redirection vers une page d'accès refusé
  router.navigate(['/access-denied']);
  return false;
};