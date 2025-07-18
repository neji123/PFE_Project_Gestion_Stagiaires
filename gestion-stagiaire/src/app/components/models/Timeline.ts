export interface TimelineStep {
    id: string;
    name: string;
    date: Date;
    isCompleted: boolean;
    isUpcoming: boolean;
    isCurrent: boolean;
    iconClass: string;
    reportId?: number;
    reportType: string;
    isApproved?: boolean;
  isRejected?: boolean;
  isPending?: boolean;
  submissionDate?: Date;
  approverId?: number;
  feedbackComments?: string;
  }
  
  export interface Timeline {
    stagiaireId: number;
    steps: TimelineStep[];
  }