import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { University } from '../../components/models/user';

@Injectable({
  providedIn: 'root'
})
export class UniversityService {
  private apiUrl = `${environment.apiUrl}/api/University`;
  
  constructor(private http: HttpClient) { }

  // Récupérer les headers avec JWT
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Récupérer toutes les universités
  getAllUniversities(): Observable<University[]> {
    return this.http.get<University[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Récupérer une université par ID
  getUniversityById(id: number): Observable<University> {
    return this.http.get<University>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Créer une nouvelle université
  createUniversity(university: University): Observable<University> {
    return this.http.post<University>(this.apiUrl, university, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Mettre à jour une université
  updateUniversity(id: number, university: University): Observable<University> {
    return this.http.put<University>(`${this.apiUrl}/${id}`, university, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Supprimer une université
  deleteUniversity(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Gestion des erreurs
  private handleError(error: any) {
    console.error('Une erreur s\'est produite', error);
    return throwError(() => error);
  }
}
