// src/app/models/notification.model.ts
export interface Notification {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    status: NotificationStatus;
    createdAt: string;
    userId: number;
    relatedEntityId?: string;
  }
  
  export interface CreateNotificationDto {
    title: string;
    message: string;
    type: NotificationType;
    userId: number;
    relatedEntityId?: string;
  }
  
  export enum NotificationType {
    Other = 0,
    Info = 1,
    Success = 2,
    Warning = 3,
    Error = 4,
    Welcome = 5,
    UserRegistration = 6
  }
  
  export enum NotificationStatus {
    Unread = 0,
    Read = 1
  }