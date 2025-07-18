import { User } from './user';

// Énumérations
export enum MeetingType {
  TuteurStagiaire = 0,
  RhStagiaire = 1,
  Evaluation = 2,
  Suivi = 3
}

export enum MeetingStatus {
  Planifie = 0,
  Confirme = 1,
  Annule = 2,
  Termine = 3
}

// Interface principale Meeting
export interface Meeting {
  id: number;
  title: string;
  type: MeetingType;
  date: Date;
  time: string; // Format HH:MM
  duration: number; // En minutes
  description?: string;
  location?: string;
  status: MeetingStatus;
  isRecurring: boolean;
  organizerId: number;
  organizer?: User;
  createdAt: Date;
  updatedAt: Date;
  participantIds: number[];
  participants?: User[];
}

// DTOs pour les requêtes API
export interface CreateMeetingDto {
  title: string;
  type: MeetingType;
  date: string; // Format YYYY-MM-DD
  time: string; // Format HH:MM
  duration: number;
  description?: string;
  location?: string;
  isRecurring?: boolean;
  organizerId: number;
  participantIds: number[];
}

export interface UpdateMeetingDto {
  title?: string;
  type?: MeetingType;
  date?: string; // Format YYYY-MM-DD
  time?: string; // Format HH:MM
  duration?: number;
  description?: string;
  location?: string;
  status?: MeetingStatus;
  isRecurring?: boolean;
  participantIds?: number[];
}

export interface MeetingFilterDto {
  type?: MeetingType;
  status?: MeetingStatus;
  startDate?: string;
  endDate?: string;
  userId?: number;
  organizerId?: number;
}

export interface AvailabilityCheckDto {
  userId: number;
  date: string; // Format YYYY-MM-DD
  time: string; // Format HH:MM
  duration: number;
  excludeMeetingId?: number;
}

// Interfaces pour le formulaire et l'affichage
export interface MeetingFormData {
  title: string;
  type: MeetingType;
  date: string;
  time: string;
  duration: number;
  description: string;
  location: string;
  isRecurring: boolean;
  participantIds: number[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    type: MeetingType;
    status: MeetingStatus;
    description?: string;
    location?: string;
    organizerId: number;
    participantIds: number[];
    participants?: User[];
  };
  classNames: string[];
}

// Interface pour les options du sélecteur de type
export interface MeetingTypeOption {
  value: MeetingType;
  label: string;
  description: string;
  color: string;
}

// Interface pour les options du sélecteur de statut
export interface MeetingStatusOption {
  value: MeetingStatus;
  label: string;
  color: string;
}

// Interface pour les conflits d'horaire
export interface TimeConflict {
  userId: number;
  userName: string;
  conflictingMeetingId: number;
  conflictingMeetingTitle: string;
  message: string;
}

// Interface pour la réponse de création/mise à jour avec conflits
export interface MeetingResponse {
  meeting?: Meeting;
  conflicts?: TimeConflict[];
  message: string;
  success: boolean;
}

// Interface pour les statistiques de meetings
export interface MeetingStats {
  totalMeetings: number;
  scheduledMeetings: number;
  completedMeetings: number;
  cancelledMeetings: number;
  upcomingMeetings: number;
  todayMeetings: number;
}

// Interface pour les options de récurrence (future extension)
export interface RecurrenceOptions {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: string;
  occurrences?: number;
}

// Types d'aide pour TypeScript
export type MeetingId = number;
export type UserId = number;

// Constantes utiles
export const MEETING_DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 heures' },
  { value: 180, label: '3 heures' }
];

export const MEETING_TYPE_OPTIONS: MeetingTypeOption[] = [
  {
    value: MeetingType.TuteurStagiaire,
    label: 'Tuteur - Stagiaire',
    description: 'Rendez-vous entre un tuteur et son stagiaire',
    color: '#4CAF50'
  },
  {
    value: MeetingType.RhStagiaire,
    label: 'RH - Stagiaire',
    description: 'Entretien RH avec un stagiaire',
    color: '#2196F3'
  },
  {
    value: MeetingType.Evaluation,
    label: 'Évaluation',
    description: 'Séance d\'évaluation du stagiaire',
    color: '#FF9800'
  },
  {
    value: MeetingType.Suivi,
    label: 'Suivi',
    description: 'Réunion de suivi de projet ou de stage',
    color: '#9C27B0'
  }
];

export const MEETING_STATUS_OPTIONS: MeetingStatusOption[] = [
  {
    value: MeetingStatus.Planifie,
    label: 'Planifié',
    color: '#FFC107'
  },
  {
    value: MeetingStatus.Confirme,
    label: 'Confirmé',
    color: '#4CAF50'
  },
  {
    value: MeetingStatus.Annule,
    label: 'Annulé',
    color: '#F44336'
  },
  {
    value: MeetingStatus.Termine,
    label: 'Terminé',
    color: '#757575'
  }
];

// Fonctions utilitaires
export function getMeetingTypeColor(type: MeetingType): string {
  const option = MEETING_TYPE_OPTIONS.find(opt => opt.value === type);
  return option?.color || '#757575';
}

export function getMeetingStatusColor(status: MeetingStatus): string {
  const option = MEETING_STATUS_OPTIONS.find(opt => opt.value === status);
  return option?.color || '#757575';
}

export function getMeetingTypeLabel(type: MeetingType): string {
  const option = MEETING_TYPE_OPTIONS.find(opt => opt.value === type);
  return option?.label || 'Inconnu';
}

export function getMeetingStatusLabel(status: MeetingStatus): string {
  const option = MEETING_STATUS_OPTIONS.find(opt => opt.value === status);
  return option?.label || 'Inconnu';
}