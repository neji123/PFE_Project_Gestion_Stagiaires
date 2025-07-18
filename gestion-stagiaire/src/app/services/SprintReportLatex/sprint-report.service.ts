import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SprintReportQuestionnaire {
  learnings: string;
  skills: string;
  difficulties: string;
}

@Injectable({
  providedIn: 'root'
})
export class SprintReportService {
  private readonly apiUrl = `${environment.apiUrl}/api/SprintReport`;

  constructor(private http: HttpClient) { }

  /**
   * Génère un rapport PDF pour un stagiaire spécifique
   */
  generateSprintReportForStagiaire(stagiaireId: number, questionnaire?: SprintReportQuestionnaire): Observable<Blob> {
    const url = `${this.apiUrl}/generate/${stagiaireId}`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = questionnaire ? {
      questionnaire: questionnaire
    } : {};

    return this.http.post(url, body, {
      headers: headers,
      responseType: 'blob'
    });
  }

  /**
   * Génère un rapport PDF pour le stagiaire connecté
   */
  generateMySprintReport(questionnaire?: SprintReportQuestionnaire): Observable<Blob> {
    const url = `${this.apiUrl}/generate-my-report`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = questionnaire ? {
      questionnaire: questionnaire
    } : {};

    return this.http.post(url, body, {
      headers: headers,
      responseType: 'blob'
    });
  }
}