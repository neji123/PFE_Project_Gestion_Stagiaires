import { Component } from '@angular/core';
import { DepartmentService } from '../../../services/Department/department.service';
import { Department } from '../../models/user';
import { AddDepartmentComponent } from '../add-department/add-department.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list-department',
  standalone: true,
  imports: [CommonModule, AddDepartmentComponent],
  templateUrl: './list-department.component.html',
  styleUrl: './list-department.component.scss'
})
export class ListDepartmentComponent {
  departments: Department[] = [];
  loading = false;
  error = '';
  success = '';
  editDepartment: Department | null = null;
  showForm = false;

  constructor(private departmentService: DepartmentService) {}

  ngOnInit() {
    this.loadDepartments();
  }

  loadDepartments() {
    this.loading = true;
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        this.loading = false;
      },
      error: () => {
        this.error = "Erreur lors du chargement des départements";
        this.loading = false;
      }
    });
  }

  onAddClick() {
    this.editDepartment = null;
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  onEditClick(dep: Department) {
    this.editDepartment = dep;
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  onFormSave(dep: Department) {
    this.loading = true;
    if (dep.id && this.editDepartment) {
      // Edition
      this.departmentService.updateDepartment(dep.id, dep).subscribe({
        next: () => {
          this.success = "Département modifié";
          this.showForm = false;
          this.loadDepartments();
        },
        error: (err) => {
          this.error = err.error?.message || "Erreur lors de la modification";
          this.loading = false;
        }
      });
    } else {
      // Ajout
      this.departmentService.createDepartment(dep).subscribe({
        next: () => {
          this.success = "Département ajouté";
          this.showForm = false;
          this.loadDepartments();
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
    this.editDepartment = null;
  }

  onDelete(dep: Department) {
    if (!confirm(`Supprimer le département "${dep.departmentName}" ?`)) return;
    this.loading = true;
    this.departmentService.deleteDepartment(dep.id).subscribe({
      next: () => {
        this.success = "Département supprimé";
        this.loadDepartments();
      },
      error: () => {
        this.error = "Erreur lors de la suppression";
        this.loading = false;
      }
    });
  }
}