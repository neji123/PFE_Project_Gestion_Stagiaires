// Dans google-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../Auth/auth-service.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-google-callback',
  standalone: true, // Si vous utilisez des composants autonomes (Angular 14+)
  imports: [
    CommonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './google-callback.component.html',
  styleUrls: ['./google-callback.component.scss']
})
export class GoogleCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Récupérer le token d'accès de l'URL
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          console.log('Access token obtenu, envoi au backend...');
          
          this.authService.loginWithGoogle(accessToken).subscribe({
            next: (res) => {
              console.log('Connexion Google réussie via callback');
              this.router.navigate(['/dashboard']);
            },
            error: (err) => {
              console.error('Erreur de connexion Google via callback', err);
              this.router.navigate(['/login'], { 
                queryParams: { error: 'Erreur de connexion Google: ' + err.message }
              });
            }
          });
        } else {
          this.router.navigate(['/login'], { 
            queryParams: { error: 'Token Google manquant dans la réponse' }
          });
        }
      } else {
        this.router.navigate(['/login'], { 
          queryParams: { error: 'Réponse Google invalide' }
        });
      }
    });
  }
}