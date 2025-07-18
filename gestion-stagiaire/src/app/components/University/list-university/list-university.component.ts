import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversityService } from '../../../services/University/university.service';
import { University } from '../../models/user';
import { AddUniversityComponent } from '../add-university/add-university.component';

@Component({
  selector: 'app-list-university',
  standalone: true,
  imports: [CommonModule, AddUniversityComponent],
  templateUrl: './list-university.component.html',
  styleUrl: './list-university.component.scss'
})
export class ListUniversityComponent {
  universities: University[] = [];
  loading = false;
  error = '';
  success = '';
  editUniversity: University | null = null;
  showForm = false;

  constructor(private universityService: UniversityService) {}

  ngOnInit() {
    this.loadUniversities();
  }

  loadUniversities() {
    this.loading = true;
    this.universityService.getAllUniversities().subscribe({
      next: (data) => {
        this.universities = data;
        this.loading = false;
      },
      error: () => {
        this.error = "Erreur lors du chargement des universités";
        this.loading = false;
      }
    });
  }

  onAddClick() {
    this.editUniversity = null;
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  onEditClick(u: University) {
    this.editUniversity = u;
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  onFormSave(u: University) {
    this.loading = true;
    if (u.id && this.editUniversity) {
      // Edition
      this.universityService.updateUniversity(u.id, u).subscribe({
        next: () => {
          this.success = "Université modifiée";
          this.showForm = false;
          this.loadUniversities();
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors de la modification";
          this.loading = false;
        }
      });
    } else {
      // Ajout
      this.universityService.createUniversity(u).subscribe({
        next: () => {
          this.success = "Université ajoutée";
          this.showForm = false;
          this.loadUniversities();
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors de l'ajout";
          this.loading = false;
        }
      });
    }
  }

  onFormCancel() {
    this.showForm = false;
    this.editUniversity = null;
  }

  onDelete(u: University) {
    if (!confirm(`Supprimer l'université "${u.universityname}" ?`)) return;
    this.loading = true;
    this.universityService.deleteUniversity(u.id).subscribe({
      next: () => {
        this.success = "Université supprimée";
        this.loadUniversities();
      },
      error: () => {
        this.error = "Erreur lors de la suppression";
        this.loading = false;
      }
    });
  }
}