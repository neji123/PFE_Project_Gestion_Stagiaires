import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttestationService {
    private apiUrl = `${environment.apiUrl}/api/LatexAttestation/generate`;
  

  constructor(private http: HttpClient) { }

  /**
   * Generate an attestation PDF for an intern
   * @param fullName The full name of the intern
   * @param startDate The start date of the internship
   * @param endDate The end date of the internship
   * @returns An observable of the PDF blob
   */
  generateAttestation(fullName: string, startDate: Date, endDate: Date): Observable<Blob> {
    const requestData = {
      fullName,
      startDate,
      endDate
    };

    return this.http.post(this.apiUrl, requestData, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle API errors
   * @param error The HTTP error response
   * @returns An observable error
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue lors de la génération de l\'attestation.';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
 * Get completed stagiaires for attestation generation
 */
getCompletedStagiaires(): Observable<any[]> {
  const url = `${environment.apiUrl}/api/Users/stagiaires/completed-for-attestation`;
  return this.http.get<any[]>(url).pipe(
    catchError(this.handleError)
  );
}

/**
 * Generate an attestation PDF for a specific stagiaire by ID
 */
generateAttestationByStagiaire(stagiaireId: number): Observable<Blob> {
  const url = `${environment.apiUrl}/api/LatexAttestation/generate-by-stagiaire`;
  const requestData = {
    stagiaireId: stagiaireId
  };

  return this.http.post(url, requestData, {
    responseType: 'blob'
  }).pipe(
    catchError(this.handleError)
  );
}
}
