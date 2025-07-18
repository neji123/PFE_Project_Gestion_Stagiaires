import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { University } from '../../models/user';

@Component({
  selector: 'app-add-university',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-university.component.html',
  styleUrl: './add-university.component.scss'
})
export class AddUniversityComponent implements OnChanges {
  @Input() university: University | null = null; // null=ajout, sinon édition
  @Input() loading = false;
  @Output() save = new EventEmitter<University>();
  @Output() cancel = new EventEmitter<void>();

  universityname: string = '';
  error: string = '';

  ngOnChanges() {
    this.universityname = this.university?.universityname ?? '';
    this.error = '';
  }

  submitForm() {
    this.error = '';
    const name = this.universityname.trim();
    if (!name) {
      this.error = 'Le nom de l\'université est requis.';
      return;
    }
    const u: University = {
      id: this.university?.id ?? 0,
      universityname: name
    };
    this.save.emit(u);
  }

  reset() {
    this.universityname = '';
    this.error = '';
    this.cancel.emit();
  }
}