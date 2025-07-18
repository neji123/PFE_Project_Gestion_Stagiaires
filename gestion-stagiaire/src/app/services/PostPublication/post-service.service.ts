import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';


export interface UserDto {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
    profileImage?: string | null;
}

export interface PostAttachmentDto {
  id: number;
  fileUrl: string;
  fileType: string;
}

export interface PostCommentDto {
  id: number;
  comment: string;
  commentedAt: string;
  user: UserDto;
}

export interface PostDto {
  id: number;
  content: string;
  createdAt: string;
  author: UserDto;
  attachments: PostAttachmentDto[];
  likesCount: number;
  comments: PostCommentDto[];
   likedByCurrentUser?: boolean;
}
export interface PostLikeDto {
  id: number;
  likedAt: string;
  user: UserDto;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = `${environment.apiUrl}/api/publications`;
  private isBrowser: boolean;
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  /** Récupère tous les posts */
  getAllPosts(): Observable<PostDto[]> {
    return this.http.get<PostDto[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        tap(posts => console.log('Posts chargés:', posts)),
        catchError(err => {
          console.error('Erreur lors du chargement des posts', err);
          return throwError(() => err);
        })
      );
  }

  /** Crée un post (RH uniquement) */
  createPost(formData: FormData): Observable<PostDto> {
    // formData doit contenir { content: string, attachments?: File[] }
    return this.http.post<PostDto>(this.apiUrl, formData, { headers: this.getHeaders() })
      .pipe(
        tap(post => console.log('Post créé:', post)),
        catchError(err => {
          console.error('Erreur lors de la création du post', err);
          return throwError(() => err);
        })
      );
  }

  /** Like un post */
  likePost(postId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/like`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(() => console.log(`Post ${postId} liké`)),
        catchError(err => {
          console.error('Erreur lors du like', err);
          return throwError(() => err);
        })
      );
  }

  /** Unlike un post */
  unlikePost(postId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/unlike`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(() => console.log(`Like retiré du post ${postId}`)),
        catchError(err => {
          console.error('Erreur lors du unlike', err);
          return throwError(() => err);
        })
      );
  }

  /** Ajoute un commentaire à un post */
addComment(postId: number, comment: string): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/${postId}/comment`,
    JSON.stringify(comment), // <-- string pur, pas { comment }
    {
      headers: this.getHeaders().set('Content-Type', 'application/json')
    }
  );
}
getPostLikes(postId: number): Observable<PostLikeDto[]> {
    return this.http.get<PostLikeDto[]>(`${this.apiUrl}/${postId}/likes`, { headers: this.getHeaders() })
      .pipe(
        tap(likes => console.log(`Likes du post ${postId}:`, likes)),
        catchError(err => {
          console.error('Erreur lors du chargement des likes', err);
          return throwError(() => err);
        })
      );
  }
  /** Modifier un post (RH seulement) */
updatePost(postId: number, formData: FormData): Observable<PostDto> {
  return this.http.put<PostDto>(`${this.apiUrl}/${postId}`, formData, { headers: this.getHeaders() });
}

/** Supprimer un post (RH seulement) */
deletePost(postId: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${postId}`, { headers: this.getHeaders() });
}
}
