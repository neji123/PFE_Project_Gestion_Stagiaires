import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PostService, PostDto } from '../../../services/PostPublication/post-service.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-publication-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './publication-create.component.html',
  styleUrls: ['./publication-create.component.scss']
})
export class PublicationCreateComponent {
  @Output() postCreated = new EventEmitter<PostDto>();
  form: FormGroup;
  files: File[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private postService: PostService
  ) {
    this.form = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(2000)]],
      attachments: [null]
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files);
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    const formData = new FormData();
    formData.append('content', this.form.value.content);
    for (const file of this.files) {
      formData.append('attachments', file);
    }
    this.postService.createPost(formData).subscribe({
      next: post => {
        this.postCreated.emit(post);
        this.form.reset();
        this.files = [];
        this.loading = false;
      },
      error: err => {
        this.error = err.message || 'Erreur lors de la création de la publication';
        this.loading = false;
      }
    });
  }
}