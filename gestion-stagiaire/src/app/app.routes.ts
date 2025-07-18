import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthService } from './Auth/auth-service.service';
import { authGuard } from './guards/auth.guard';
import { ListStagiaireComponent } from './components/stagiaire/list-stagiaire/list-stagiaire.component';
import { ListRHComponent } from './components/RH/list-rh/list-rh.component';
import { ListTuteurComponent } from './components/tuteur/list-tuteur/list-tuteur.component';
import { DetailTuteurComponent } from './components/tuteur/detail-tuteur/detail-tuteur.component';
import { DetailStagiaireComponent } from './components/stagiaire/detail-stagiaire/detail-stagiaire.component';
import { EspaceStagiaireComponent } from './components/stagiaire/espace-stagiaire/espace-stagiaire.component';
import { DetailRhComponent } from './components/RH/detail-rh/detail-rh.component';
import { ProjectListComponent } from './components/Project/project-list/project-list.component';
import { ProjectCreateComponent } from './components/Project/project-create/project-create.component';
import { ProjectDetailComponent } from './components/Project/project-detail/project-detail.component';
import { SprintDetailComponent } from './components/Sprint/sprint-detail/sprint-detail.component';
import { MesProjetsComponent } from './components/Project/mes-projets/mes-projets.component';
import { MesStagiairesComponent } from './components/tuteur/mes-stagiaires/mes-stagiaires.component';
import { roleGuard } from './guards/role.guard';
import { ProfileComponent } from './pages/Profile/profile/profile.component';
import { LoginTuteurRhComponent } from './pages/login-tuteur-rh/login-tuteur-rh.component';
import { GoogleCallbackComponent } from './pages/CallbackGoogle/google-callback/google-callback.component';
import { ForgotPasswordComponent } from './pages/Password/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/Password/reset-password/reset-password.component';
import { ReportsListComponent } from './components/Reporting/reports-list/reports-list.component';
import { TimelineComponent } from './components/Reporting/timeline/timeline.component';
import { ReportApprovalComponent } from './components/Reporting/report-approval/report-approval.component';
import { NotificationListComponent } from './components/Notification/notification-list/notification-list.component';
import { LatexAttestationComponent } from './components/LatexAttestation/latex-attestation/latex-attestation.component';
import { TuteurDashboardComponent } from './components/Dashboard/tuteur-dashboard/tuteur-dashboard.component';
import { AdminDashboardComponent } from './components/Dashboard/admin-dashboard/admin-dashboard.component';
import { RhDashboardComponent } from './components/Dashboard/rh-dashboard/rh-dashboard.component';
import { StagiaireDashboardComponent } from './components/Dashboard/stagiaire-dashboard/stagiaire-dashboard.component';
import { CalendarComponent } from './components/Calendar/calendar.component';
import { ReportTypesAdminComponent } from './components/Reporting/report-types-admin/report-types-admin.component';
import { RatingDashboardComponent } from './components/Rating/rating-dashboard/rating-dashboard.component';
import { RatingFormComponent } from './components/Rating/rating-form/rating-form.component';
import { RatingDetailComponent } from './components/Rating/rating-detail/rating-detail.component';
import { PublicationFeedComponent } from './components/Publication/publication-feed/publication-feed.component';
import { PublicationItemComponent } from './components/Publication/publication-item/publication-item.component';
import { JobOfferListComponent } from './components/JobOffer/job-offer-list/job-offer-list.component';
import { JobOfferFormComponent } from './components/JobOffer/job-offer-form/job-offer-form.component';
import { JobOfferDetailComponent } from './components/JobOffer/job-offer-detail/job-offer-detail.component';
export const routes: Routes = [
 
 
  {  path: 'login', component: LoginComponent},
  { path: 'log', component: LoginTuteurRhComponent },
  { path: 'google-callback', component: GoogleCallbackComponent },

  { path: 'forgot-password', component: ForgotPasswordComponent},
  {path: 'reset-password',component: ResetPasswordComponent},

  { path: 'Accueil', component: DashboardComponent },
  { path: 'stagiaires', component: ListStagiaireComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },
  { path: 'RH', loadComponent: () => import('./components/RH/list-rh/list-rh.component').then(c => c.ListRHComponent), canActivate: [authGuard, roleGuard], data: { roles: ['RHs', 'Admin', 'Tuteur'] }  },
  { path: 'tuteurs', component: ListTuteurComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },
  { path: 'tuteur/:id', component: DetailTuteurComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },
  { path: 'stagiaire/:id', component: DetailStagiaireComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },
  { path: 'espace-stagiaire/:id', component: EspaceStagiaireComponent },
  { path: 'RH/:id', component: DetailRhComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },

  { path: 'projects', component: ProjectListComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] }},
  { path: 'mes-projets', component: MesProjetsComponent, canActivate: [authGuard],data: { roles: ['Stagiaire'] } },

  { path: 'projects/create', component: ProjectCreateComponent,canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },
  { path: 'projects/:id', component: ProjectDetailComponent},
  {  path: 'projects/edit/:id',  component: ProjectCreateComponent, canActivate: [authGuard, roleGuard], data: { roles: ['Admin', 'Tuteur', 'RHs'] } },
  { path: 'sprints/:id', component: SprintDetailComponent},

{
  path: 'departements',
  loadComponent: () => import('./components/Department/list-department/list-department.component').then(c => c.ListDepartmentComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['RHs', 'Admin'] }
},
{
  path: 'universites',
  loadComponent: () => import('./components/University/list-university/list-university.component').then(m => m.ListUniversityComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['RHs', 'Admin'] }
},

  { 
    path: 'mes-stagiaires', 
    component: MesStagiairesComponent, 
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Tuteur'] }
  },
  //stepper 
  {
  path: 'ooo',
  component: TimelineComponent,

},
//rapports  
{
    path: 'documents',
    component: ReportsListComponent,
     },

     { 
      path: 'reports/approval', 
      component: ReportApprovalComponent,
      canActivate: [authGuard,roleGuard],
      data: { roles: ['Tuteur', 'Admin', 'RHs'] }
    },
    { 
      path: 'notifications', 
      component: NotificationListComponent,
      
      //canActivate: [authGuard,roleGuard]
    },

     { 
      path: 'attestation', 
      component: LatexAttestationComponent,
      canActivate: [authGuard,roleGuard],
      data: { roles: ['RHs'] }
    },
    { 
    path: 'admin-dashboard', 
  component: AdminDashboardComponent, 
  canActivate: [authGuard, roleGuard],
  data: { roles: ['Tuteur'] }
},
    { 
  path: 'tuteur-dashboard', 
  component: TuteurDashboardComponent, 
  canActivate: [authGuard, roleGuard],
  data: { roles: ['Tuteur'] }
},

{ 
  path: 'RH-dashboard', 
  component: RhDashboardComponent, 
  canActivate: [authGuard, roleGuard],
  data: { roles: ['RHs'] }
},
{ 
  path: 'Stagiaire-dashboard', 
  component: StagiaireDashboardComponent, 
  canActivate: [authGuard, roleGuard],
  data: { roles: ['Stagiaire'] }
},
  { path: 'calendar', component: CalendarComponent },

 { 
    path: 'ratings', 
    children: [
      { path: '', component: RatingDashboardComponent, canActivate: [authGuard] },
      { path: 'dashboard', component: RatingDashboardComponent, canActivate: [authGuard] },
      { path: 'create', component: RatingFormComponent, canActivate: [authGuard] },
      { path: 'edit/:id', component: RatingFormComponent, canActivate: [authGuard] },
      { path: 'detail/:id', component: RatingDetailComponent, canActivate: [authGuard] },
      { path: 'my-ratings', redirectTo: '/ratings', pathMatch: 'full' },
      { path: 'about-me', redirectTo: '/ratings', pathMatch: 'full' },
      { path: 'drafts', redirectTo: '/ratings', pathMatch: 'full' },
      
    ]
  },

  { path: 'rating', redirectTo: '/ratings', pathMatch: 'full' },
  { path: 'rate', redirectTo: '/ratings/create', pathMatch: 'full' },

  { path: 'publications',
     component: PublicationFeedComponent,
      canActivate: [authGuard, roleGuard],
       data: { roles: ['RHs', 'Tuteur', 'Stagiaire'] }},
 { path: 'publications/:id',
     component: PublicationItemComponent,
      canActivate: [authGuard, roleGuard],
       data: { roles: ['RHs', 'Tuteur', 'Stagiaire'] }},



  { 
  path: 'admin/report-types', 
  component: ReportTypesAdminComponent, 
  canActivate: [authGuard, roleGuard],
  data: { roles: ['RHs'] }
},
{
  path: 'job-offers',
  children: [
    {
      path: '',
      component: JobOfferListComponent,
      canActivate: [authGuard,roleGuard],
      data: { 
        title: 'Offres d\'emploi',
        breadcrumb: 'Offres d\'emploi',
        roles: ['Admin', 'RHs'] 
      }
    },
    {
      path: 'create',
      component: JobOfferFormComponent,
      canActivate: [authGuard, roleGuard],
      data: { 
        title: 'Créer une offre d\'emploi',
        breadcrumb: 'Nouvelle offre',
        roles: ['RHs', 'Admin'] // Seuls RHs et Admin peuvent créer
      }
    },
    {
      path: 'edit/:id',
      component: JobOfferFormComponent,
      canActivate: [authGuard, roleGuard],
      data: { 
        title: 'Modifier l\'offre d\'emploi',
        breadcrumb: 'Modifier',
        roles: ['RHs', 'Admin'] // Seuls RHs et Admin peuvent modifier
      }
    },
    {
      path: ':id',
      component: JobOfferDetailComponent,
      canActivate: [authGuard],
      data: { 
        title: 'Détails de l\'offre',
        breadcrumb: 'Détails',
        roles: ['Admin', 'RHs'] 
      }
    }
  ]
},
  


  { path: 'profile', component: ProfileComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' } 
];
