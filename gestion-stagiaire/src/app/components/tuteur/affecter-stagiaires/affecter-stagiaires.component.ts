import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/User/user.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-affecter-stagiaires',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './affecter-stagiaires.component.html',
  styleUrls: ['./affecter-stagiaires.component.scss']
})
export class AffecterStagiairesComponent implements OnInit {
  stagiairesDisponibles: any[] = [];
  stagiairesSelectionnes: number[] = [];
  isLoading = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<AffecterStagiairesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tuteurId: number, tuteurName: string },
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadStagiairesDisponibles();
  }

  loadStagiairesDisponibles(): void {
    this.isLoading = true;
    
    this.userService.getStagiairesSansTuteur().subscribe({
      next: (stagiaires) => {
        this.stagiairesDisponibles = stagiaires;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des stagiaires disponibles:', err);
        this.error = 'Impossible de charger les stagiaires disponibles';
        this.isLoading = false;
      }
    });
  }

  toggleSelection(stagiaireId: number): void {
    const index = this.stagiairesSelectionnes.indexOf(stagiaireId);
    if (index === -1) {
      // Ajouter à la sélection
      this.stagiairesSelectionnes.push(stagiaireId);
    } else {
      // Retirer de la sélection
      this.stagiairesSelectionnes.splice(index, 1);
    }
  }

  isSelected(stagiaireId: number): boolean {
    return this.stagiairesSelectionnes.includes(stagiaireId);
  }

  affecter(): void {
    if (this.stagiairesSelectionnes.length === 0) {
      this.error = 'Veuillez sélectionner au moins un stagiaire';
      return;
    }

    this.isLoading = true;
    
    this.userService.affecterStagiaires(this.data.tuteurId, this.stagiairesSelectionnes).subscribe({
      next: () => {
        this.dialogRef.close({ success: true, count: this.stagiairesSelectionnes.length });
      },
      error: (err) => {
        console.error('Erreur lors de l\'affectation des stagiaires:', err);
        this.error = 'Impossible d\'affecter les stagiaires sélectionnés';
        this.isLoading = false;
      }
    });
  }

  annuler(): void {
    this.dialogRef.close();
  }
  
  // Méthode pour gérer correctement les URLs d'images
  getImageUrl(relativeUrl: string | null): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    
    // Si c'est déjà une URL complète, retournez-la telle quelle
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Sinon, préfixez avec l'URL du backend
    return `${environment.apiUrl}${relativeUrl}`;
  }
  
  // Gestion des erreurs d'image
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/default-profile.jpg';
  }
}