import { Sprint } from "./Sprint";
export interface Project {
    id?: number;
    title: string;
    description: string;
    imageUrl?: string;
    startDate?: Date;
    endDate?: Date;
    createdAt?: Date;
    sprints?: Sprint[];
    users?: any[];
    projectUsers?: any[];
    highlighted?: boolean;
  }
  