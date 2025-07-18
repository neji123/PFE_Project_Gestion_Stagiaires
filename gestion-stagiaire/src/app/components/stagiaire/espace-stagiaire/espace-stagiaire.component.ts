import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { FooterComponent } from '../../layout/footer/footer.component';

interface Stagiaire {
  id: number;
  nom: string;
  email: string;
  age: number;
  role?: string;
  duree?: number;
  note?: number;
  departement?: string;
  photo?: string;
}

interface Tache {
  titre: string;
  description: string;
  statut: string;
}

interface Evaluation {
  semaine: string;
  note: string;
}

@Component({
  selector: 'app-espace-stagiaire',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    NavbarComponent,
    SidebarComponent,
    FooterComponent
  ],
  templateUrl: './espace-stagiaire.component.html',
  styleUrl: './espace-stagiaire.component.scss'
})
export class EspaceStagiaireComponent implements OnInit {
  isSidebarVisible = true;
  stagiaireId: number = 0;
  stagiaire: any = {
    nom: '',
    departement: '',
    tuteur: 'Jean Dupont',
    dateDebut: '01/06/2023',
    dateFin: '31/12/2023',
    photo: '/api/placeholder/120/120'
  };
  
  taches: Tache[] = [
    {
      titre: 'Implémenter une API REST',
      description: 'Créer une API pour gérer les utilisateurs.',
      statut: 'completed'
    },
    {
      titre: 'Améliorer les tests unitaires',
      description: 'Ajouter des tests pour couvrir 90% du code.',
      statut: 'in-progress'
    },
    {
      titre: 'Optimiser les requêtes SQL',
      description: 'Réduire le temps de chargement des données.',
      statut: 'pending'
    }
  ];
  
  evaluations: Evaluation[] = [
    { semaine: 'Semaine 1', note: '4.5/5' },
    { semaine: 'Semaine 2', note: '4.7/5' },
    { semaine: 'Semaine 3', note: '4.8/5' }
  ];
  
  // Données des stagiaires (à remplacer par un service)
  stagiaires: Stagiaire[] = [
    { 
      id: 1, 
      nom: 'Paul Dupuis', 
      email: 'paul.dupuis@example.com', 
      age: 24, 
      role: 'Développeur Logiciel', 
      duree: 6, 
      note: 4.8, 
      departement: 'IT',
      photo: '/api/placeholder/120/120'
    },
    { 
      id: 2, 
      nom: 'Sophie Martin', 
      email: 'sophie.martin@example.com', 
      age: 23, 
      role: 'Ingénieur Réseau', 
      duree: 4, 
      note: 4.6, 
      departement: 'IT',
      photo: '/api/placeholder/120/120'
    },
    { 
      id: 3, 
      nom: 'Lucas Durand', 
      email: 'lucas.durand@example.com', 
      age: 25, 
      role: 'Analyste Données', 
      duree: 5, 
      note: 4.7, 
      departement: 'DATA',
      photo: '/api/placeholder/120/120'
    }
  ];
  
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit(): void {
    // Récupérer l'id du stagiaire depuis l'URL
    this.route.params.subscribe(params => {
      this.stagiaireId = +params['id']; // Conversion en nombre
      const stagiaireFound = this.getStagiaireById(this.stagiaireId);
      
      if (stagiaireFound) {
        this.stagiaire = {
          ...this.stagiaire,
          nom: stagiaireFound.nom,
          departement: stagiaireFound.departement,
          photo: stagiaireFound.photo
        };
      }
    });
    
    // Vérifier la taille de l'écran au chargement
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));
  }
  
  getStagiaireById(id: number): Stagiaire | undefined {
    return this.stagiaires.find(s => s.id === id);
  }
  
  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
  
  private checkScreenSize(): void {
    // Cacher la sidebar par défaut sur les écrans mobiles
    if (window.innerWidth <= 768) {
      this.isSidebarVisible = false;
    } else {
      this.isSidebarVisible = true;
    }
  }
  
  getStatusLabel(statut: string): string {
    switch (statut) {
      case 'completed': return 'Terminée';
      case 'in-progress': return 'En cours';
      case 'pending': return 'En attente';
      default: return '';
    }
  }
}