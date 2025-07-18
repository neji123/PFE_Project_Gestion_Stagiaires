import { Component, OnInit } from '@angular/core';
import { PostService, PostDto } from '../../../services/PostPublication/post-service.service';
import { AuthService } from '../../../Auth/auth-service.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PublicationCreateComponent } from '../publication-create/publication-create.component';
import { PublicationItemComponent } from '../publication-item/publication-item.component';

@Component({
  selector: 'app-publication-feed',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PublicationCreateComponent,
    PublicationItemComponent
  ],
  templateUrl: './publication-feed.component.html',
  styleUrls: ['./publication-feed.component.scss']
})
export class PublicationFeedComponent implements OnInit {
  posts: PostDto[] = [];
  loading = false;
  error: string | null = null;

  get isRH(): boolean {
    const user = this.auth.currentUserValue;
    return user && user.role === 'RHs';
  }

  constructor(
    private postService: PostService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts() {
    this.loading = true;
    this.error = null;
    this.postService.getAllPosts().subscribe({
      next: posts => {
        this.posts = posts;
        this.loading = false;
      },
      error: err => {
        this.error = 'Erreur lors du chargement des publications';
        this.loading = false;
      }
    });
  }

  onPostCreated(post: PostDto) {
    this.posts.unshift(post); // Ajoute le nouveau post en haut du fil
  }
}