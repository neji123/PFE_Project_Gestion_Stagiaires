// src/app/components/task/task-create/task-create.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'
import { SprintService } from '../../../services/Sprint/sprint.service';
import { TaskService } from '../../../services/Task/task.service';
import { UserService } from '../../../services/User/user.service';
import { Sprint,SprintStatus } from '../../models/Sprint';
import { Task,TaskStatus   } from '../../models/Task';


@Component({
  selector: 'app-task-create',
  templateUrl: './task-create.component.html',
  styleUrls: ['./task-create.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class TaskCreateComponent implements OnInit {
  taskForm: FormGroup;
  sprint: Sprint | null = null;
  sprintId: number | null = null;
  users: any[] = [];
  loading = true;
  submitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private sprintService: SprintService,
    private userService: UserService
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      assignedToId: [null]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    
    const sprintId = this.route.snapshot.paramMap.get('sprintId');
    if (sprintId) {
      this.sprintId = +sprintId;
      this.loadSprint(this.sprintId);
    } else {
      this.error = 'ID de sprint manquant';
      this.loading = false;
    }
  }

  loadSprint(id: number): void {
    this.sprintService.getSprintById(id).subscribe({
      next: (sprint) => {
        this.sprint = sprint;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement du sprint';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
      }
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid || !this.sprintId) {
      return;
    }

    this.submitting = true;
    const task: Task = {
      title: this.taskForm.get('title')?.value,
      description: this.taskForm.get('description')?.value,
      status: TaskStatus.Todo,
      sprintId: this.sprintId,
      assignedToId: this.taskForm.get('assignedToId')?.value || null
    };

    this.taskService.createTask(task).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/sprints', this.sprintId]);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Erreur lors de la création de la tâche', err);
        this.error = 'Erreur lors de la création de la tâche';
      }
    });
  }

  cancel(): void {
    if (this.sprintId) {
      this.router.navigate(['/sprints', this.sprintId]);
    } else {
      this.router.navigate(['/projects']);
    }
  }
}
