import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { 
  featherUsers, featherUserCheck, featherAward, featherBell, 
  featherFileText, featherCheckCircle, featherAlertCircle, 
  featherCalendar, featherClock, featherMessageSquare, featherCheck
} from '@ng-icons/feather-icons';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-4 flex items-center">
      <div [class]="bgColor + ' p-3 rounded-full'">
        <ng-icon [name]="getIconName()" [class]="iconColor" size="24"></ng-icon>
      </div>
      <div class="ml-4">
        <p class="text-gray-500">{{ label }}</p>
        <p class="text-2xl font-bold">{{ value }}</p>
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() icon: string = 'users';
  @Input() bgColor: string = 'bg-blue-100';
  @Input() iconColor: string = 'text-blue-600';
  @Input() label: string = '';
  @Input() value: number = 0;

  // Mapping des icônes utilisées dans le template
  private iconObjects = {
    'users': featherUsers,
    'user-check': featherUserCheck,
    'award': featherAward,
    'bell': featherBell,
    'file-text': featherFileText,
    'check-circle': featherCheckCircle,
    'alert-circle': featherAlertCircle,
    'calendar': featherCalendar,
    'clock': featherClock,
    'message-square': featherMessageSquare,
    'file-check': featherCheck
  };

  getIconName(): string {
    const prefix = 'feather';
    const iconKey = this.icon.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    return prefix + iconKey.charAt(0).toUpperCase() + iconKey.slice(1);
  }
}