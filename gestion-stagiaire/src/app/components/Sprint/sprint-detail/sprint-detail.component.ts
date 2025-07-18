import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SprintService } from '../../../services/Sprint/sprint.service';
import { TaskService } from '../../../services/Task/task.service';
import { UserService } from '../../../services/User/user.service';
import { Sprint, SprintStatus } from '../../models/Sprint';
import { Task, TaskStatus } from '../../models/Task';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-sprint-detail',
  templateUrl: './sprint-detail.component.html',
  styleUrls: ['./sprint-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ]
})
export class SprintDetailComponent implements OnInit {
  sprint: Sprint | null = null;
  tasks: Task[] = [];
  loading = true;
  error: string | null = null;
  taskForm: FormGroup;
  showTaskForm = false;
  submittingTask = false;
  users: any[] = [];
  projectId: number | null = null;
  
  // Pour les états des tâches
  TaskStatus = TaskStatus;
  todoTasks: Task[] = [];
  inProgressTasks: Task[] = [];
  doneTasks: Task[] = [];
  
  // Map pour stocker les noms d'utilisateurs par ID
  private userMap: Map<number, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sprintService: SprintService,
    private taskService: TaskService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      assignedToId: [null]
    });
  }

  ngOnInit(): void {
    // Récupérer le projectId depuis les query params
    const projectIdParam = this.route.snapshot.queryParams['projectId'];
    if (projectIdParam) {
      this.projectId = +projectIdParam;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSprint(+id);
      this.loadUsers();
    } else {
      this.error = 'ID de sprint invalide';
      this.loading = false;
    }
  }

  loadSprint(id: number): void {
    this.loading = true;
    this.sprintService.getSprintById(id).subscribe({
      next: (sprint) => {
        this.sprint = sprint;
        console.log("Sprint chargé:", this.sprint);
        
        // Si le sprint a un projectId et qu'on n'a pas déjà un projectId depuis les query params
        if (this.sprint.projectId && !this.projectId) {
          this.projectId = this.sprint.projectId;
          console.log("ProjectId récupéré du sprint:", this.projectId);
        }
        
        this.loadTasks(id);
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement du sprint';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadTasks(sprintId: number): void {
    this.taskService.getTasksBySprintId(sprintId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.categorizeTasks();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des tâches';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        
        // Créer une map des utilisateurs pour un accès rapide par ID
        this.users.forEach(user => {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          this.userMap.set(user.id, fullName);
        });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
      }
    });
  }

  /**
   * Obtient le nom complet d'un utilisateur à partir de son ID
   */
  getUserName(userId: number): string {
    return this.userMap.get(userId) || 'Utilisateur inconnu';
  }

  categorizeTasks(): void {
    this.todoTasks = this.tasks.filter(t => t.status === TaskStatus.Todo);
    this.inProgressTasks = this.tasks.filter(t => t.status === TaskStatus.InProgress);
    this.doneTasks = this.tasks.filter(t => t.status === TaskStatus.Done);
  }

  toggleTaskForm(): void {
    this.showTaskForm = !this.showTaskForm;
    if (!this.showTaskForm) {
      this.taskForm.reset();
    }
  }

  onSubmitTask(): void {
    if (this.taskForm.invalid || !this.sprint) {
      return;
    }

    this.submittingTask = true;
    const task: Task = {
      title: this.taskForm.get('title')?.value,
      description: this.taskForm.get('description')?.value,
      status: TaskStatus.Todo,
      sprintId: this.sprint.id as number,
      assignedToId: this.taskForm.get('assignedToId')?.value || null
    };

    this.taskService.createTask(task).subscribe({
      next: (newTask) => {
        this.tasks.push(newTask);
        this.categorizeTasks();
        this.toggleTaskForm();
        this.submittingTask = false;
      },
      error: (err) => {
        console.error('Erreur lors de la création de la tâche', err);
        this.submittingTask = false;
        alert('Erreur lors de la création de la tâche');
      }
    });
  }

  updateTaskStatus(task: Task, newStatus: TaskStatus): void {
    if (task.status === newStatus) {
      return;
    }

    const updatedTask = {
      ...task,
      status: newStatus
    };

    this.taskService.updateTask(task.id as number, updatedTask).subscribe({
      next: () => {
        task.status = newStatus;
        this.categorizeTasks();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut', err);
        alert('Erreur lors de la mise à jour du statut de la tâche');
      }
    });
  }

  goToProject(): void {
    if (this.projectId) {
      console.log("Navigation vers le projet:", this.projectId);
      this.router.navigate(['/projects', this.projectId]);
    } else {
      console.log("ProjectId non disponible, redirection vers la liste des projets");
      this.router.navigate(['/projects']);
    }
  }
}