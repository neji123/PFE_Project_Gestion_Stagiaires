// src/app/models/job-offer.model.ts

export interface JobOffer {
  id: number;
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
  departmentName?: string;
  publishedByUserId: number;
  publishedByName?: string;
  publishedAt: Date;
}

export interface CreateJobOffer {
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
}

export interface UpdateJobOffer {
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number;
}

export interface JobOfferSimple {
  id: number;
  title: string;
  departmentName: string;
  publishedByName: string;
  publishedAt: Date;
}

export interface JobOfferFormData {
  title: string;
  description: string;
  requiredSkills: string;
  departmentId: number | null;
  skillsArray?: string[]; // Pour faciliter la manipulation dans les formulaires
}

export interface Department {
  id: number;
  departmentName: string;
}

export interface JobOfferFilters {
  departmentId?: number;
  searchKeyword?: string;
  publisherId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface JobOfferStatistics {
  totalOffers: number;
  offersByDepartment: { [key: string]: number };
  recentOffers: number;
  myOffers?: number;
}

// Énums pour les constantes
export enum JobOfferValidationMessages {
  TITLE_REQUIRED = 'Le titre est obligatoire',
  TITLE_MAX_LENGTH = 'Le titre ne peut pas dépasser 200 caractères',
  DESCRIPTION_REQUIRED = 'La description est obligatoire',
  DESCRIPTION_MAX_LENGTH = 'La description ne peut pas dépasser 5000 caractères',
  SKILLS_REQUIRED = 'Les compétences requises sont obligatoires',
  SKILLS_MAX_LENGTH = 'Les compétences ne peuvent pas dépasser 2000 caractères',
  DEPARTMENT_REQUIRED = 'Le département est obligatoire'
}

export enum JobOfferConstants {
  TITLE_MAX_LENGTH = 200,
  DESCRIPTION_MAX_LENGTH = 5000,
  SKILLS_MAX_LENGTH = 2000,
  RECENT_OFFERS_COUNT = 10
}