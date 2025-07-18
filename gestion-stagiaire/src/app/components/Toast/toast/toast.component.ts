// src/app/components/toast/toast.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService,Toast } from '../../../services/Toast/toast.service';
import { Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <div 
      *ngFor="let toast of toasts" 
      class="max-w-sm transform transition-all duration-300 ease-in-out"
      [class.opacity-0]="toast.isExiting"
      [ngClass]="getToastClass(toast.type)">
      <div class="p-4 rounded-lg shadow-lg flex items-start">
        <!-- Icône du toast -->
        <div class="flex-shrink-0 mr-3">
          <svg *ngIf="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <svg *ngIf="toast.type === 'info'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <svg *ngIf="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <svg *ngIf="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        
        <!-- Contenu du toast -->
        <div class="flex-1">
          <div class="flex justify-between items-start">
            <h3 class="text-sm font-medium" [ngClass]="getTextColorClass(toast.type)">
              {{ toast.title }}
            </h3>
            <button 
              (click)="removeToast(toast.id)"
              class="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none">
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <p class="mt-1 text-sm text-gray-700">{{ toast.message }}</p>
        </div>
      </div>
    </div>
  </div>`,
styles: [`
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  :host {
    display: block;
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
  }
  
  .max-w-sm {
    animation: slideIn 0.3s ease-out forwards;
    margin-bottom: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  
  .opacity-0 {
    animation: fadeOut 0.3s ease-in forwards;
  }
`]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (Toast & { isExiting: boolean })[] = [];
  private subscriptions: Subscription[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.toastService.toasts$.subscribe(toasts => {
        // Filtrer les toasts qui sont déjà en train de disparaître
        const newToasts = toasts.filter(t => !this.toasts.some(et => et.id === t.id && et.isExiting));
        
        // Ajouter les nouveaux toasts avec l'animation d'entrée
        this.toasts = [
          ...this.toasts.filter(t => t.isExiting), // Conserver les toasts qui sont en train de disparaître
          ...newToasts.map(t => ({ ...t, isExiting: false }))
        ];
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  removeToast(id: number): void {
    // Trouver le toast dans la liste
    const index = this.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      // Marquer le toast comme en train de disparaître
      this.toasts[index].isExiting = true;
      
      // Supprimer le toast après l'animation
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 300); // Durée de l'animation
    }
    
    // Informer le service
    this.toastService.remove(id);
  }

  getToastClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'info':
        return 'bg-blue-50 border-l-4 border-blue-400';
      case 'warning':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      case 'error':
        return 'bg-red-50 border-l-4 border-red-400';
      default:
        return 'bg-gray-50 border-l-4 border-gray-400';
    }
  }

  getTextColorClass(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'info':
        return 'text-blue-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-gray-800';
    }
  }
}