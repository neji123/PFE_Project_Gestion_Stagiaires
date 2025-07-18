import { Task } from "./Task";
export enum SprintStatus {
    Todo = 'Todo',
    InProgress = 'InProgress',
    Done = 'Done'
  }
  
  export interface Sprint {
    id?: number;
    name: string;
    description: string;
    status: SprintStatus;
    startDate: Date;
    endDate: Date;
    projectId: number;
    createdAt?: Date;
    tasks?: Task[];
  }