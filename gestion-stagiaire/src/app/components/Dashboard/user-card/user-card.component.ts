// user-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex items-center border-b pb-2">
      <div class="w-10 h-10 rounded-full bg-gray-200">
        <img *ngIf="user?.profilePictureUrl" [src]="user.profilePictureUrl" 
             alt="User" class="w-full h-full rounded-full object-cover">
      </div>
      <div class="ml-3">
        <p class="font-medium">{{ user?.firstName }} {{ user?.lastName }}</p>
        <p class="text-sm text-gray-500" *ngIf="showTimestamp">{{ user?.timestamp }}</p>
        <p class="text-sm text-gray-500" *ngIf="showRole">{{ user?.role }}</p>
      </div>
    </div>
  `
})
export class UserCardComponent {
  @Input() user: any;
  @Input() showTimestamp: boolean = false;
  @Input() showRole: boolean = false;
}