import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { UserService } from '../../../services/User/user.service';
import { ProjectService } from '../../../services/Project/project.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-assign-stagiaires-dialog',
  templateUrl: './assign-stagiaires-dialog.component.html',
  styleUrls: ['./assign-stagiaires-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ]
})
export class AssignStagiairesDialogComponent implements OnInit {
  // 📋 Listes des stagiaires
  availableStagiaires: any[] = [];        // Stagiaires disponibles (non affectés)
  filteredStagiaires: any[] = [];         // Stagiaires filtrés par recherche
  currentlyAssignedStagiaires: any[] = []; // Stagiaires actuellement dans le projet
  
  // 🎯 Sélections
  selectedStagiaires: string[] = [];       // IDs des stagiaires sélectionnés
  
  // 🔄 États
  loading = false;
  error: string | null = null;
  
  // 📊 Statistiques (optionnelles pour l'affichage)
  stats = {
    totalAvailable: 0,
    totalInProject: 0,
    selectedCount: 0
  };

  constructor(
    public dialogRef: MatDialogRef<AssignStagiairesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectId: number, projectTitle: string },
    private userService: UserService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    console.log(`🚀 Initialisation du dialogue pour le projet: ${this.data.projectTitle} (ID: ${this.data.projectId})`);
    this.loadData();
  }

  /**
   * 🔄 Charge toutes les données nécessaires
   */
  async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // Charger en parallèle les stagiaires disponibles et ceux actuellement assignés
      const [availableStagiaires, currentAssignments] = await Promise.all([
        this.loadAvailableStagiaires(),
        this.loadCurrentlyAssignedStagiaires()
      ]);

      console.log('✅ Toutes les données chargées avec succès');
      this.updateStats();
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      this.error = 'Erreur lors du chargement des données';
    } finally {
      this.loading = false;
    }
  }

  /**
   * 📥 Charge les stagiaires disponibles (non affectés à aucun projet)
   */
private loadAvailableStagiaires(): Promise<any[]> {
  console.log('🎨 Chargement des stagiaires disponibles avec style EY...');
  
  return new Promise((resolve, reject) => {
    this.userService.getUnassignedStagiaires().subscribe({
      next: (stagiaires) => {
        console.log(`✅ ${stagiaires.length} stagiaires NON AFFECTÉS chargés`);
        
        // 📊 Log détaillé pour débogage
        if (stagiaires.length === 0) {
          console.log('⚠️ Aucun stagiaire disponible - tous sont déjà affectés à des projets');
        } else {
          stagiaires.forEach(s => {
            console.log(`📋 Disponible: ${s.firstName} ${s.lastName} (ID: ${s.id})`);
            console.log(`   📧 Email: ${s.email}`);
            console.log(`   👤 Username: ${s.username}`);
            console.log(`   🏫 Université: ${s.university}`);
            console.log(`   🏢 Département: ${s.department}`);
          });
        }
        
        this.availableStagiaires = stagiaires;
        this.filteredStagiaires = [...stagiaires];
        resolve(stagiaires);
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des stagiaires disponibles:', err);
        reject(err);
      }
    });
  });
}


  /**
 * Génère les initiales pour l'avatar
 */
getInitials(firstName: string, lastName: string): string {
  return firstName && lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : '??';
}

/**
 * Génère une couleur de fond basée sur le nom
 */
getAvatarColor(firstName: string, lastName: string): string {
  const name = `${firstName}${lastName}`;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 60%)`;
}

/**
 * Gestion des images avec URL complète
 */
 // Méthode pour gérer correctement les URLs d'images
  getImageUrl(relativeUrl: string | null): string {
    if (!relativeUrl) return 'assets/images/default-profile.jpg';
    
    // Si c'est déjà une URL complète, retournez-la telle quelle
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Sinon, préfixez avec l'URL du backend
    return `${environment.apiUrl}${relativeUrl}`;
  }

/**
 * Gestion des erreurs d'image
 */
handleImageError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.src = 'assets/images/default-profile.jpg';
}

  /**
   * 📥 Charge les stagiaires actuellement assignés au projet
   */
  private loadCurrentlyAssignedStagiaires(): Promise<any[]> {
    console.log('📥 Chargement des stagiaires actuellement assignés...');
    
    return new Promise((resolve, reject) => {
      this.projectService.getProjectUsers(this.data.projectId).subscribe({
        next: (users) => {
          // Filtrer uniquement les stagiaires (au cas où il y aurait d'autres rôles)
          const assignedStagiaires = users.filter(user => user.role === 'Stagiaire');
          
          console.log(`✅ ${assignedStagiaires.length} stagiaires actuellement assignés au projet`);
          this.currentlyAssignedStagiaires = assignedStagiaires;
          
          // Initialiser les sélections avec les stagiaires déjà assignés
          this.selectedStagiaires = assignedStagiaires
            .map(s => (s.id || s.userId || '').toString())
            .filter(id => id);
          
          console.log('🎯 Sélections initiales:', this.selectedStagiaires);
          resolve(assignedStagiaires);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des stagiaires assignés:', err);
          // Continuer même en cas d'erreur (projet sans stagiaires assignés)
          this.currentlyAssignedStagiaires = [];
          this.selectedStagiaires = [];
          resolve([]);
        }
      });
    });
  }

 /**
 * 🔍 Filtrage amélioré des stagiaires
 */
filterStagiaires(searchTerm: string, selectedDepartment?: string): void {
  console.log(`🔍 Filtrage avec terme: "${searchTerm}" et département: "${selectedDepartment}"`);
  
  if ((!searchTerm || searchTerm.trim() === '') && !selectedDepartment) {
    this.filteredStagiaires = [...this.availableStagiaires];
    console.log(`📋 Affichage de tous les ${this.filteredStagiaires.length} stagiaires`);
    return;
  }
  
  const term = searchTerm ? searchTerm.toLowerCase().trim() : '';
  
  this.filteredStagiaires = this.availableStagiaires.filter(stagiaire => {
    // Filtre par terme de recherche
    let matchesSearch = true;
    if (term) {
      const searchFields = [
        stagiaire.firstName,
        stagiaire.lastName,
        stagiaire.email,
        stagiaire.username,
        stagiaire.university,
        stagiaire.department
      ];
      
      matchesSearch = searchFields.some(field => 
        field && field.toLowerCase().includes(term)
      );
    }
    
    // Filtre par département
    let matchesDepartment = true;
    if (selectedDepartment && selectedDepartment !== '') {
      matchesDepartment = stagiaire.department === selectedDepartment;
    }
    
    return matchesSearch && matchesDepartment;
  });
  
  console.log(`📋 ${this.filteredStagiaires.length} stagiaires trouvés après filtrage`);
}

// Nouvelle méthode pour obtenir la liste des départements
getDepartments(): string[] {
  const departments = this.availableStagiaires
    .map(s => s.department)
    .filter(dept => dept && dept.trim() !== '')
    .filter((dept, index, arr) => arr.indexOf(dept) === index) // Supprimer les doublons
    .sort();
  
  return departments;
}
  
  /**
   * ✅ Vérifie si un stagiaire est sélectionné
   */
  isSelected(stagiaireId: string): boolean {
    const id = stagiaireId.toString();
    return this.selectedStagiaires.includes(id);
  }

 /**
 * 🔄 Bascule la sélection avec feedback visuel
 */
toggleSelection(stagiaireId: string): void {
  const id = stagiaireId.toString();
  console.log(`🎨 EY - Basculement de la sélection pour le stagiaire ${id}`);
  
  const index = this.selectedStagiaires.indexOf(id);
  if (index === -1) {
    this.selectedStagiaires.push(id);
    console.log(`✅ EY - Stagiaire ${id} ajouté à la sélection`);
    
    // Trouver le stagiaire pour log détaillé
    const stagiaire = this.availableStagiaires.find(s => s.id.toString() === id);
    if (stagiaire) {
      console.log(`   👤 ${stagiaire.firstName} ${stagiaire.lastName} sélectionné`);
    }
  } else {
    this.selectedStagiaires.splice(index, 1);
    console.log(`❌ EY - Stagiaire ${id} retiré de la sélection`);
  }
  
  this.updateStats();
  console.log('🎯 Sélection EY actuelle:', this.selectedStagiaires);
}

/**
 * 🎯 Mise à jour des statistiques avec animations
 */
private updateStats(): void {
  this.stats = {
    totalAvailable: this.availableStagiaires.length,
    totalInProject: this.currentlyAssignedStagiaires.length,
    selectedCount: this.selectedStagiaires.length
  };
  
  console.log('📊 Statistiques mises à jour:', this.stats);
}

  /**
   * ❌ Annule et ferme le dialogue
   */
  onCancel(): void {
    console.log('❌ Annulation du dialogue');
    this.dialogRef.close(false);
  }

 /**
 * 💾 Sauvegarde avec feedback EY
 */
onSave(): void {
  console.log('💾 EY - Sauvegarde des modifications...');
  console.log('🎯 Stagiaires sélectionnés EY:', this.selectedStagiaires);
  console.log('📋 Stagiaires actuellement assignés:', this.currentlyAssignedStagiaires.map(s => s.id));
  
  this.loading = true;
  
  // Calculer les différences
  const currentlyAssignedIds = this.currentlyAssignedStagiaires.map(s => String(s.id));
  const stagiaireIdsToAdd = this.selectedStagiaires.filter(id => !currentlyAssignedIds.includes(String(id)));
  const stagiaireIdsToRemove = currentlyAssignedIds.filter(id => !this.selectedStagiaires.includes(String(id)));
  
  console.log('✨ EY - Modifications à apporter:');
  console.log('➕ Stagiaires à ajouter:', stagiaireIdsToAdd);
  console.log('➖ Stagiaires à retirer:', stagiaireIdsToRemove);
  
  // Si aucun changement, fermer simplement
  if (stagiaireIdsToAdd.length === 0 && stagiaireIdsToRemove.length === 0) {
    console.log('ℹ️ EY - Aucun changement détecté');
    this.dialogRef.close(false);
    return;
  }
  
  // Envoyer les modifications au serveur
  this.projectService.updateProjectUsers(this.data.projectId, stagiaireIdsToAdd, stagiaireIdsToRemove)
    .subscribe({
      next: (response) => {
        console.log('✅ EY - Modifications sauvegardées avec succès:', response);
        
        // Log des stagiaires affectés avec leurs noms
        stagiaireIdsToAdd.forEach(id => {
          const stagiaire = this.availableStagiaires.find(s => s.id.toString() === id);
          if (stagiaire) {
            console.log(`🎉 ${stagiaire.firstName} ${stagiaire.lastName} affecté au projet "${this.data.projectTitle}"`);
          }
        });
        
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('❌ EY - Erreur lors de la sauvegarde:', err);
        this.error = 'Erreur lors de la sauvegarde des modifications';
        this.loading = false;
      }
    });
}

  /**
   * 🔄 Rafraîchit les données
   */
  refreshData(): void {
    console.log('🔄 Rafraîchissement des données...');
    this.loadData();
  }

  /**
   * 🧪 Méthode de test pour débogage
   */
  testAddRemove(): void {
    console.log('🧪 === TEST DE SÉLECTION ===');
    console.log('📊 Statistiques actuelles:', this.stats);
    console.log('📋 Stagiaires disponibles:', this.availableStagiaires.length);
    console.log('📋 Stagiaires actuellement assignés:', this.currentlyAssignedStagiaires.length);
    console.log('🎯 Stagiaires sélectionnés:', this.selectedStagiaires);
    console.log('🧪 === FIN DU TEST ===');
  }
}