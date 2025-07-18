// Interfaces utilisateurs
export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  role: UserRole;
  department?: Department;
  departmentId?: number;
  status?: boolean;
  tuteurId?: number;
  tuteur?: User;
  skills?: string;
}

// Enumération des rôles utilisateur
export enum UserRole {
  Admin = 'Admin',
  RHs = 'RHs',
  Tuteur = 'Tuteur',
  Stagiaire = 'Stagiaire',
  Ressource = 'Ressource'
}

// Interface pour le département
export interface Department {
  id: number;
  departmentName: string;
}

// Enumération pour les types de stage
export enum StageType {
  StageEte = 'stage_été',
  StagePFE = 'stage_pfe'
}

// Enumération pour les niveaux d'études
export enum EducationLevel {
  Ingenierie = 'ingénierie',
  Licence = 'licence',
  Master = 'master'
}

// Interface pour l'université
export interface University {
  id: number;
  universityname: string;
}

// Interface spécifique pour le RH
export interface RH extends User {
  // Propriétés spécifiques au RH si nécessaire
}

// Interface spécifique pour le Tuteur
export interface Tuteur extends User {
  yearsExperience?: number;
  stagiaires?: Stagiaire[];
}

// Interface spécifique pour le Stagiaire
export interface Stagiaire extends User {
  startDate?: Date | string;
  endDate?: Date | string;
  note?: number;
  tuteurId?: number;
  tuteur?: Tuteur;
  university?: University;
  universityId?: number;
  stageType?: StageType;
  educationLevel?: EducationLevel;
}