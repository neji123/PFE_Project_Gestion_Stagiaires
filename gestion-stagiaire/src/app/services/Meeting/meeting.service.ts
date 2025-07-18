import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

// Export the string constants for types and statuses
export const MeetingType = {
  TuteurStagiaire: "tuteur-stagiaire", // lowercase, no space
  RhStagiaire: "rh-stagiaire", // lowercase, no space
  Evaluation: "evaluation", // lowercase
  Suivi: "suivi" // lowercase
} as const;

export const MeetingStatus = {
  Planifie: "planifie",
  Confirme: "confirme",
  Annule: "annule",
  Termine: "termine"
} as const;

// Define types that will extract the string literal types from the constants
export type MeetingType = typeof MeetingType[keyof typeof MeetingType];
export type MeetingStatus = typeof MeetingStatus[keyof typeof MeetingStatus];

export interface Meeting {
  id?: number;
  title: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  description?: string;
  location?: string;
  status: string;
  isRecurring?: boolean;
  organizerId: number;
  organizer?: any;
  participantIds?: number[];
  participants?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMeetingDto {
  title: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  description?: string;
  location?: string;
  organizerId: number;
  participantIds: number[];
  status?: string;
}

export interface UpdateMeetingDto {
  title?: string;
  type?: string;
  date?: string;
  time?: string;
  duration?: number;
  description?: string;
  location?: string;
  participantIds?: number[];
  status?: string;
}

export interface MeetingFilterDto {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  organizerId?: number;
}

export interface AvailabilityCheckDto {
  userId: number;
  date: string;
  time: string;
  duration: number;
  excludeMeetingId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MeetingService {
  private apiUrl = `${environment.apiUrl}/api/meetings`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (this.isBrowser) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  private handleError(error: any) {
  console.error('Erreur dans MeetingService:', error);
  
  // Try to extract more detailed error information
  let errorDetails = 'Unknown error';
  
  if (error.error) {
    if (typeof error.error === 'string') {
      try {
        // Try to parse error as JSON
        const parsedError = JSON.parse(error.error);
        console.error('Parsed error details:', parsedError);
        errorDetails = JSON.stringify(parsedError);
      } catch (e) {
        // If not JSON, use as is
        errorDetails = error.error;
        console.error('Error text:', error.error);
      }
    } else {
      // Object error
      console.error('Error object:', error.error);
      if (error.error.message) {
        errorDetails = error.error.message;
      }
      if (error.error.errors) {
        console.error('Validation errors:', error.error.errors);
        errorDetails += ' ' + JSON.stringify(error.error.errors);
      }
    }
  }
  
  // Log the full request that was made
  console.error('Status code:', error.status);
  console.error('Status text:', error.statusText);
  console.error('URL:', error.url);
  
  return throwError(() => new Error(errorDetails));
}

  // Récupérer tous les meetings
  getAllMeetings(filter?: MeetingFilterDto): Observable<Meeting[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.type !== undefined) params = params.set('type', filter.type);
      if (filter.status !== undefined) params = params.set('status', filter.status);
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.userId) params = params.set('userId', filter.userId.toString());
      if (filter.organizerId) params = params.set('organizerId', filter.organizerId.toString());
    }

    return this.http.get<Meeting[]>(this.apiUrl, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(meetings => console.log('Meetings récupérés:', meetings)),
      catchError(this.handleError)
    );
  }

  // Récupérer un meeting par ID
  getMeetingById(id: number): Observable<Meeting> {
    return this.http.get<Meeting>(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer les meetings d'un utilisateur
  getMeetingsByUser(userId: number): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(`${this.apiUrl}/user/${userId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Créer un nouveau meeting
createMeeting(meeting: CreateMeetingDto): Observable<Meeting> {
  // Create a deep copy to avoid modifying the original
  const meetingData = {
    title: meeting.title,
    type: meeting.type,
    date: meeting.date,
    time: meeting.time,
    duration: Number(meeting.duration),
    description: meeting.description || '',
    location: meeting.location || '',
    organizerId: Number(meeting.organizerId),
    participantIds: meeting.participantIds.map(id => Number(id)),
    status: "planifie",
    isRecurring: false
  };
  
  // Format date if needed
  if (meetingData.date) {
    try {
      const dateObj = new Date(meetingData.date);
      meetingData.date = dateObj.toISOString().split('T')[0];
    } catch (e) {
      console.error('Error formatting date:', e);
    }
  }
  
  // Format time if needed
  if (meetingData.time && !meetingData.time.match(/^\d{2}:\d{2}$/)) {
    try {
      const timeArr = meetingData.time.split(':');
      if (timeArr.length >= 2) {
        meetingData.time = `${timeArr[0].padStart(2, '0')}:${timeArr[1].padStart(2, '0')}`;
      }
    } catch (e) {
      console.error('Error formatting time:', e);
    }
  }
  
  console.log('Sending meeting data to backend:', JSON.stringify(meetingData));
  
  return this.http.post<Meeting>(this.apiUrl, meetingData, { 
    headers: this.getHeaders() 
  }).pipe(
    tap(response => console.log('Meeting créé:', response)),
    catchError(this.handleError)
  );
}

  // Mettre à jour un meeting
 updateMeeting(id: number, meeting: any): Observable<Meeting> {
  console.log('🔄 updateMeeting appelé avec ID:', id, 'Data:', meeting);
  
  // Créer un objet propre pour le backend
  const meetingData: any = {};
  
  if (meeting.title) meetingData.title = meeting.title;
  if (meeting.type) meetingData.type = meeting.type.toLowerCase();
  if (meeting.date) {
    const dateObj = new Date(meeting.date);
    meetingData.date = dateObj.toISOString().split('T')[0];
  }
  if (meeting.time) {
    const timeArr = meeting.time.split(':');
    meetingData.time = `${timeArr[0].padStart(2, '0')}:${timeArr[1].padStart(2, '0')}`;
  }
  if (meeting.duration) meetingData.duration = Number(meeting.duration);
  if (meeting.description !== undefined) meetingData.description = meeting.description || '';
  if (meeting.location !== undefined) meetingData.location = meeting.location || '';
  if (meeting.status) meetingData.status = meeting.status.toLowerCase();
  if (meeting.participantIds) meetingData.participantIds = meeting.participantIds.map((id: any) => Number(id));
  
  console.log('📤 Données envoyées au backend:', meetingData);
  
  return this.http.put<Meeting>(`${this.apiUrl}/${id}`, meetingData, { 
    headers: this.getHeaders() 
  }).pipe(
    tap(response => console.log('✅ Réponse backend:', response)),
    catchError(error => {
      console.error('❌ Erreur complète:', error);
      console.error('❌ Status:', error.status);
      console.error('❌ Error body:', error.error);
      return this.handleError(error);
    })
  );
}

  // Supprimer un meeting
  deleteMeeting(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Vérifier la disponibilité
  checkAvailability(checkDto: AvailabilityCheckDto): Observable<{ isAvailable: boolean }> {
    // Format date
    if (checkDto.date) {
      try {
        const dateObj = new Date(checkDto.date);
        checkDto.date = dateObj.toISOString().split('T')[0];
      } catch (e) {
        console.error('Error formatting date:', e);
      }
    }
    
    return this.http.post<{ isAvailable: boolean }>(`${this.apiUrl}/check-availability`, checkDto, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Updated to accept string parameters
getMeetingTypeLabel(type: string): string {
  console.log('🏷️ getMeetingTypeLabel appelé avec:', type);
  
  // Convertir en minuscules et supprimer les espaces
  const cleanType = type?.toString().toLowerCase().replace(/[-\s]/g, '');
  
  const labels: Record<string, string> = {
    // Versions en minuscules
    "tuteurstagiaire": 'Tuteur-Stagiaire',
    "tuteur-stagiaire": 'Tuteur-Stagiaire',  
    "rhstagiaire": 'RH-Stagiaire',
    "rh-stagiaire": 'RH-Stagiaire',
    "evaluation": 'Évaluation',
    "suivi": 'Suivi',
    
    // Versions exactes (au cas où)
    "TuteurStagiaire": 'Tuteur-Stagiaire',
    "RhStagiaire": 'RH-Stagiaire', 
    "Evaluation": 'Évaluation',
    "Suivi": 'Suivi'
  };
  
  const result = labels[cleanType] || labels[type] || `Type: ${type}`;
  console.log('🏷️ Résultat:', result);
  return result;
}

getMeetingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    "Planifie": 'Planifié',
    "Confirme": 'Confirmé',
    "Annule": 'Annulé',
    "Termine": 'Terminé'
  };
  return labels[status] || 'Inconnu';
}

getMeetingTypeColor(type: string): string {
  const colors: Record<string, string> = {
    "TuteurStagiaire": '#4F46E5',
    "RhStagiaire": '#059669',
    "Evaluation": '#DC2626',
    "Suivi": '#7C3AED'
  };
  return colors[type] || '#6B7280';
}
}