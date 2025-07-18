import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ProjectService } from '../../../services/Project/project.service';
import { Project } from '../../models/Project';
import { Sprint, SprintStatus } from '../../models/Sprint'; // Assurez-vous d'importer les bons types
import { Task, TaskStatus } from '../../models/Task'; // Assurez-vous d'importer les bons types
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';

@Component({
  selector: 'app-mes-projets',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    SidebarComponent
  ],
  templateUrl: './mes-projets.component.html',
  styleUrls: ['./mes-projets.component.scss']
})
export class MesProjetsComponent implements OnInit {
  isSidebarVisible = true;
  projects: Project[] = [];
  loading = true;
  error: string | null = null;
  
  // Utilisez les enums corrects de votre application
  // Ces valeurs sont des exemples, remplacez-les par vos propres valeurs
  readonly SPRINT_STATUS_COMPLETED: SprintStatus = SprintStatus.Done; // Adaptez selon votre enum
  readonly TASK_STATUS_COMPLETED: TaskStatus = TaskStatus.Done; // Adaptez selon votre enum
  
  constructor(private projectService: ProjectService) {}
  
  ngOnInit(): void {
    this.loadUserProjects();
  }
  
  loadUserProjects(): void {
    this.loading = true;
    this.projectService.getUserProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
        console.log('Projets de l\'utilisateur chargés:', projects.length);
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement de vos projets';
        this.loading = false;
        console.error(err);
      }
    });
  }
  
  getProjectStatus(project: Project): string {
    const today = new Date();
    
    if (project.endDate && new Date(project.endDate) < today) {
      return 'Terminé';
    }
    
    if (project.startDate && new Date(project.startDate) > today) {
      return 'Planifié';
    }
    
    // Utiliser l'enum SprintStatus au lieu de la chaîne littérale
    const isDelayed = project.sprints?.some(sprint => 
      sprint.endDate && new Date(sprint.endDate) < today && sprint.status !== this.SPRINT_STATUS_COMPLETED
    );
    
    if (isDelayed) {
      return 'En retard';
    }
    
    if (project.startDate && new Date(project.startDate) <= today) {
      return 'En cours';
    }
    
    return 'Planifié';
  }
  
  getProjectStatusClass(project: Project): string {
    const status = this.getProjectStatus(project);
    
    switch (status) {
      case 'Terminé':
        return 'status-completed';
      case 'En cours':
        return 'status-in-progress';
      case 'Planifié':
        return 'status-planning';
      case 'En retard':
        return 'status-delayed';
      default:
        return 'status-planning';
    }
  }
  
  getProjectProgress(project: Project): number {
    let totalTasks = 0;
    let completedTasks = 0;
    
    project.sprints?.forEach(sprint => {
      if (sprint.tasks) {
        totalTasks += sprint.tasks.length;
        // Utiliser l'enum TaskStatus au lieu de la chaîne littérale
        completedTasks += sprint.tasks.filter(task => task.status === this.TASK_STATUS_COMPLETED).length;
      }
    });
    
    if (totalTasks === 0) return 0;
    
    return Math.round((completedTasks / totalTasks) * 100);
  }
  
  getCompletedTasks(project: Project): string {
    let totalTasks = 0;
    let completedTasks = 0;
    
    project.sprints?.forEach(sprint => {
      if (sprint.tasks) {
        totalTasks += sprint.tasks.length;
        // Utiliser l'enum TaskStatus au lieu de la chaîne littérale
        completedTasks += sprint.tasks.filter(task => task.status === this.TASK_STATUS_COMPLETED).length;
      }
    });
    
    return `${completedTasks}/${totalTasks}`;
  }
  
  refreshProjects(): void {
    this.loadUserProjects();
  }

  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }
}