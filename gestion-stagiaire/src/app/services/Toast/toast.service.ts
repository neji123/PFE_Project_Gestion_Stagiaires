// src/app/services/toast.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastIdCounter = 0;
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() {}

  // Afficher un nouveau toast
  show(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', duration = 5000): void {
    const toast: Toast = {
      id: this.toastIdCounter++,
      title,
      message,
      type,
      duration
    };

    // Ajouter le toast à la liste
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Supprimer automatiquement le toast après la durée spécifiée
    setTimeout(() => {
      this.remove(toast.id);
    }, duration);
  }

  // Supprimer un toast
  remove(id: number): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }
}