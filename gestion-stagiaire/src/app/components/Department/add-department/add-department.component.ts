import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Department } from '../../models/user';
import { FormsModule } from '@angular/forms'; 
@Component({
  selector: 'app-add-department',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-department.component.html',
  styleUrl: './add-department.component.scss'
})
export class AddDepartmentComponent {
  @Input() department: Department | null = null; // null = mode ajout, sinon édition
  @Input() loading = false;
  @Output() save = new EventEmitter<Department>();
  @Output() cancel = new EventEmitter<void>();

  departmentName: string = '';
  error: string = '';

  ngOnChanges() {
    this.departmentName = this.department?.departmentName ?? '';
    this.error = '';
  }

  submitForm() {
    this.error = '';
    const name = this.departmentName.trim();
    if (!name) {
      this.error = 'Le nom du département est requis.';
      return;
    }
    const dep: Department = {
      id: this.department?.id ?? 0,
      departmentName: name
    };
    this.save.emit(dep);
  }

  reset() {
    this.departmentName = '';
    this.error = '';
    this.cancel.emit();
  }
}