// recent-activity.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { 
  featherBell, featherCheckCircle, featherMessageSquare, 
  featherUsers, featherFileText 
} from '@ng-icons/feather-icons';

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  template: `
    <div class="space-y-3">
      <div *ngFor="let activity of activities" class="flex items-center border-b pb-2">
        <div [class]="getIconBgClass(activity.type) + ' p-2 rounded'">
          <ng-icon [name]="getIconName(activity.type)" [class]="getIconColorClass(activity.type)" size="16"></ng-icon>
        </div>
        <div class="ml-3">
          <p class="font-medium">{{ activity.text }}</p>
          <p class="text-sm text-gray-500">{{ activity.time }}</p>
        </div>
      </div>
    </div>
  `
})
export class RecentActivityComponent {
  @Input() activities: any[] = [];

  getIconName(type: string): string {
    switch (type) {
      case 'notification': return 'featherBell';
      case 'completion': return 'featherCheckCircle';
      case 'message': return 'featherMessageSquare';
      case 'user': return 'featherUsers';
      case 'document': return 'featherFileText';
      default: return 'featherBell';
    }
  }

  getIconBgClass(type: string): string {
    switch (type) {
      case 'notification': return 'bg-blue-100';
      case 'completion': return 'bg-green-100';
      case 'message': return 'bg-rose-100';
      case 'user': return 'bg-purple-100';
      case 'document': return 'bg-yellow-100';
      default: return 'bg-blue-100';
    }
  }

  getIconColorClass(type: string): string {
    switch (type) {
      case 'notification': return 'text-blue-600';
      case 'completion': return 'text-green-600';
      case 'message': return 'text-rose-600';
      case 'user': return 'text-purple-600';
      case 'document': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  }
}