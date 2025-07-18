// src/app/services/project.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError,tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { Project } from '../../components/models/Project';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/api/projects`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Headers HTTP avec token d'authentification
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return headers;
  }

  // Get all projects
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Get project by id
  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Create new project with FormData
  createProject(formData: FormData): Observable<Project> {
    let headers = new HttpHeaders();
  
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return this.http.post<Project>(this.apiUrl, formData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update project with FormData
  updateProject(id: number, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Delete project
  deleteProject(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Assign users to project
  assignUsersToProject(projectId: number, userIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${projectId}/users`, userIds, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Remove user from project
  removeUserFromProject(projectId: number, userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${projectId}/users/${userId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('Une erreur s\'est produite', error);
    return throwError(() => error);
  }

  getProjectUsers(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/users/projects/${projectId}/users`, { headers: this.getHeaders() })
    .pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des utilisateurs du projet:', error);
        return throwError(() => error);
      })
    ); }
  
  updateProjectUsers(projectId: number, usersToAdd: string[], usersToRemove: string[]): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/users/projects/${projectId}/users`, {
      usersToAdd,
      usersToRemove
    }, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la mise à jour des utilisateurs du projet:', error);
          return throwError(() => error);
        })
      );
  }

  getUserProjects(): Observable<Project[]> {
    console.log('Requesting user projects...');
    console.log('Token available:', !!localStorage.getItem('auth_token'));
    
    return this.http.get<Project[]>(`${environment.apiUrl}/api/projects/user/projects`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(projects => console.log('Projects received:', projects.length)),
      catchError(error => {
        console.error('Error fetching user projects:', error);
        
        // Si erreur 401 (non autorisé), vérifier l'état d'authentification
        if (error.status === 401) {
          console.log('Authentication issue - checking state');
          const authToken = localStorage.getItem('auth_token');
          const currentUser = localStorage.getItem('currentUser');
          
          console.log('Auth state: token exists=', !!authToken, 'user exists=', !!currentUser);
        }
        
        return throwError(() => error);
      })
    );
  }
  
}
