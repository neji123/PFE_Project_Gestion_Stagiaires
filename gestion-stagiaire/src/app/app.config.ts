import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { withInterceptors } from '@angular/common/http';
import { errorInterceptor,authInterceptor } from './interceptors/error.interceptor';
import { SocialLoginModule, SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { provideNgIconsConfig } from '@ng-icons/core';
import { provideIcons } from '@ng-icons/core';
import { MigrationService } from './services/Migration/migration.service';
import { ReportTypeService } from './services/Report/ReportType/report-type.service';
import { ReportService } from './services/Report/report.service';
import { 
  featherUsers, featherUserCheck, featherAward, featherBell, 
  featherFileText, featherCheckCircle, featherAlertCircle, 
  featherCalendar, featherClock, featherMessageSquare, featherCheck
} from '@ng-icons/feather-icons';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideClientHydration(), 
    provideAnimationsAsync(),
    provideAnimations(), 
ReportTypeService,
    ReportService,
    MigrationService,
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor,authInterceptor])),
    importProvidersFrom(SocialLoginModule),
    provideIcons({
      featherUsers, featherUserCheck, featherAward, featherBell, 
      featherFileText, featherCheckCircle, featherAlertCircle, 
      featherCalendar, featherClock, featherMessageSquare, featherCheck
    }),
    provideNgIconsConfig({
      size: '1em',
    }),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider('893564927083-8iscvjs6i1j158fbrkqoa7bjtt53fhfe.apps.googleusercontent.com')
          }
        ]
      } as SocialAuthServiceConfig
    }
  ]
};