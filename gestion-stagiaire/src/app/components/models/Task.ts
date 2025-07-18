export enum TaskStatus {
    Todo = 'Todo',
    InProgress = 'InProgress',
    Done = 'Done'
  }
  
  export interface Task {
    id?: number;
    title: string;
    description: string;
    status: TaskStatus;
    sprintId: number;
    assignedToId?: number;
    assignedTo?: any;
    createdAt?: Date;
  }