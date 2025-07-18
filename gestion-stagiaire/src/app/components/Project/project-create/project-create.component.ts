import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Project } from '../../models/Project';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router';
import { UserService } from '../../../services/User/user.service';
import { ProjectService } from '../../../services/Project/project.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [ CommonModule, 
    ReactiveFormsModule,
    RouterModule,
    NgSelectModule],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.scss'
})
export class ProjectCreateComponent implements OnInit {
  projectForm: FormGroup;
  imagePreview: string | ArrayBuffer | null = null;
  submitting = false;
  users: any[] = [];
  selectedUsers: number[] = [];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private userService: UserService,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      image: [null],
      startDate: [null],
      endDate: [null],
      userIds: [[]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => console.error('Erreur lors du chargement des utilisateurs', err)
    });
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.projectForm.patchValue({ image: file });
      
      // Preview de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onUserSelectionChange(userIds: number[]): void {
    this.selectedUsers = userIds;
    this.projectForm.patchValue({ userIds: userIds });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      return;
    }

    this.submitting = true;
    const formData = new FormData();
    formData.append('Title', this.projectForm.get('title')?.value);
    formData.append('Description', this.projectForm.get('description')?.value);
    
    if (this.projectForm.get('startDate')?.value) {
      formData.append('StartDate', new Date(this.projectForm.get('startDate')?.value).toISOString());
    }
    
    if (this.projectForm.get('endDate')?.value) {
      formData.append('EndDate', new Date(this.projectForm.get('endDate')?.value).toISOString());
    }

    if (this.projectForm.get('image')?.value) {
      formData.append('Image', this.projectForm.get('image')?.value);
    }

    for (const userId of this.selectedUsers) {
      formData.append('UserIds', userId.toString());
    }

    this.projectService.createProject(formData).subscribe({
      next: (project) => {
        this.submitting = false;
        this.router.navigate(['/projects', project.id]);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Erreur lors de la création du projet', err);
        alert('Erreur lors de la création du projet');
      }
    });
  }
}