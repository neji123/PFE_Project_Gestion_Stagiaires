import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of, forkJoin, Observable } from 'rxjs';
import { takeUntil, switchMap, map, tap, catchError } from 'rxjs/operators';
import { MeetingService,Meeting, MeetingType, MeetingStatus, CreateMeetingDto } from '../../services/Meeting/meeting.service';
import { AuthService } from '../../Auth/auth-service.service';
import { UserService } from '../../services/User/user.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  meetings: Meeting[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Signals pour la réactivité
  isLoading = signal(false);
  currentDate = signal(new Date());
  meetings = signal<Meeting[]>([]);
  
  // Propriétés pour les filtres
  selectedUserId: number | '' = '';
  selectedType: MeetingType | '' = '';
  selectedStatus: MeetingStatus | '' = '';
  
  // Utilisateurs pour les filtres (seulement ceux avec qui l'utilisateur peut interagir)
  users: any[] = [];
  
  // Modal states
  showCreateModal = false;
  selectedMeeting: Meeting | null = null;
  isCreating = false;
  isEditMode = false;
editingMeetingId: number | null = null;

  participantSearchText: string = '';
participantRoleFilter: string = '';
filteredUsers: any[] = [];
  // Nouveau meeting
  newMeeting: CreateMeetingDto = {
    title: '',
    type: "TuteurStagiaire",
    date: '',
    time: '',
    duration: 60,
    description: '',
    location: '',
    organizerId: 0,
    participantIds: [],
    status: "planifie"
  };
  
  MeetingTypes = MeetingType;
  MeetingStatuses = MeetingStatus;
  
  // Constantes
  weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
 
  // Computed pour les jours du calendrier
  calendarDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Premier et dernier jour du mois
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Jour de la semaine du premier jour (0 = dimanche)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Générer 42 jours (6 semaines)
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 35; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      
      const dayMeetings = this.meetings().filter(meeting => {
        const meetingDate = new Date(meeting.date);
        return meetingDate.toDateString() === currentDay.toDateString();
      });
      
      days.push({
        date: currentDay,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === today.toDateString(),
        meetings: dayMeetings
      });
    }
    
    return days;
  });

  constructor(
    private meetingService: MeetingService,
    private authService: AuthService,
    private userService: UserService,
     private http: HttpClient 
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

private async initializeComponent() {
  try {
    this.isLoading.set(true);
    
    // Récupérer l'utilisateur actuel
    const currentUser = this.authService.currentUserValue;
   
    if (currentUser) {
      this.newMeeting.organizerId = currentUser.id;
    }
    
    // ÉTAPE 1: Charger TOUS les utilisateurs dans le cache (NOUVEAU)
    await this.loadAllUsersCache();
    
    // ÉTAPE 2: Charger les utilisateurs disponibles et meetings
    await Promise.all([
      this.loadAvailableUsers(),
      this.loadUserMeetings()
    ]);
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  } finally {
    this.isLoading.set(false);
  }
}

  /**
   * Charger seulement les utilisateurs avec qui l'utilisateur connecté peut programmer des meetings
   * LOGIQUE AMÉLIORÉE : Filtre selon le rôle exact de l'utilisateur
   */
private loadAvailableUsers() {
  return new Promise<void>((resolve, reject) => {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      this.users = [];
      this.filteredUsers = []; // ← AJOUTEZ AUSSI ICI
      resolve();
      return;
    }

    console.log(`🔍 Chargement des utilisateurs disponibles pour: ${currentUser.username} (${currentUser.role})`);

    // Récupérer les utilisateurs selon le rôle de l'utilisateur connecté
    this.getAvailableUsersForRole(currentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          // Exclure TOUJOURS l'utilisateur connecté de la liste des participants
          this.users = users.filter(user => user.id !== currentUser.id);
          this.filteredUsers = [...this.users]; // ← AJOUTEZ CETTE LIGNE ICI
          
          console.log(`✅ ${this.users.length} utilisateur(s) disponible(s) pour ${currentUser.role}:`);
          this.users.forEach(u => console.log(`   - ${u.firstName} ${u.lastName} (${u.role})`));
          resolve();
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des utilisateurs:', error);
          this.users = [];
          this.filteredUsers = []; // ← AJOUTEZ AUSSI ICI
          resolve(); // Continue même en cas d'erreur
        }
      });
  });
}

/**
 * LOGIQUE PRINCIPALE : Récupère les utilisateurs disponibles selon le rôle de l'utilisateur connecté
 * 
 * TUTEUR → Ses stagiaires assignés + TOUS les RH
 * RH → Tous les utilisateurs 
 * STAGIAIRE → SON tuteur assigné + tous les RH (utilise getStagiairesByTuteur existante)
 */
private getAvailableUsersForRole(currentUser: any) {
  const userId = currentUser.id;
  const userRole = currentUser.role;

  console.log(`🎯 getAvailableUsersForRole appelé pour: ${currentUser.username} (Rôle: ${userRole})`);

  // Convertir le rôle pour affichage
  const roleName = this.getRoleName(userRole);
  console.log(`🎭 Rôle décodé: ${roleName}`);

  if (this.isRH(userRole)) {
    // RH (rôle 1) peut programmer avec tout le monde
    console.log('👥 RH: Récupération de tous les utilisateurs');
    return this.userService.getAllUsers().pipe(
      tap(users => {
        console.log(`📊 ${users.length} utilisateurs trouvés pour RH`);
        if (users.length === 0) {
          console.error('❌ PROBLÈME: getAllUsers() retourne une liste vide !');
        }
      }),
      catchError(error => {
        console.error('❌ Erreur getAllUsers pour RH:', error);
        return of([]);
      })
    );
  } 
  else if (this.isTuteur(userRole)) {
    // ✅ CORRECTION: Tuteur peut programmer avec ses stagiaires + TOUS les RH
    console.log(`🎓 Tuteur: Récupération des stagiaires assignés + RH pour tuteur ID ${userId}`);
    
    // Récupérer les stagiaires ET les RH en parallèle
    return forkJoin({
      stagiaires: this.userService.getStagiairesByTuteur(userId).pipe(
        tap(stagiaires => {
          console.log(`📚 ${stagiaires.length} stagiaire(s) trouvé(s) pour ce tuteur:`);
          stagiaires.forEach(s => console.log(`   → ${s.firstName} ${s.lastName}`));
        }),
        catchError(error => {
          console.error('❌ Erreur getStagiairesByTuteur:', error);
          return of([]);
        })
      ),
      rhUsers: this.userService.getUsersByRole('RHs').pipe(
        tap(rhUsers => {
          console.log(`👔 ${rhUsers.length} utilisateur(s) RH trouvé(s) avec getUsersByRole('RHs'):`);
          rhUsers.forEach(rh => console.log(`   → ${rh.firstName} ${rh.lastName}`));
        }),
        catchError(error => {
          console.error('❌ Erreur getUsersByRole RHs:', error);
          // Fallback: Essayer avec 'RH' si 'RHs' ne fonctionne pas
          console.log('🔄 Tentative avec getUsersByRole("RH")...');
          return this.userService.getUsersByRole('RH').pipe(
            tap(rhUsers => {
              console.log(`👔 ${rhUsers.length} utilisateur(s) RH trouvé(s) avec getUsersByRole('RH'):`);
              rhUsers.forEach(rh => console.log(`   → ${rh.firstName} ${rh.lastName}`));
            }),
            catchError(fallbackError => {
              console.error('❌ Erreur getUsersByRole RH (fallback):', fallbackError);
              // Dernier recours: Filtrer tous les utilisateurs par rôle = 1
              console.log('🔄 Dernier recours: filtrage manuel des RH...');
              return this.userService.getAllUsers().pipe(
                map(allUsers => {
                  const rhUsers = allUsers.filter(user => this.isRH(user.role));
                  console.log(`👔 ${rhUsers.length} utilisateur(s) RH trouvé(s) par filtrage manuel:`);
                  rhUsers.forEach(rh => console.log(`   → ${rh.firstName} ${rh.lastName}`));
                  return rhUsers;
                }),
                catchError(() => of([]))
              );
            })
          );
        })
      )
    }).pipe(
      map(result => {
        // Combiner les stagiaires et les RH
        const combinedUsers = [...result.stagiaires, ...result.rhUsers];
        console.log(`✅ ${combinedUsers.length} utilisateur(s) disponible(s) pour Tuteur (${result.stagiaires.length} stagiaires + ${result.rhUsers.length} RH):`);
        combinedUsers.forEach(u => {
          const roleName = this.getRoleName(u.role);
          console.log(`   → ${u.firstName} ${u.lastName} (${roleName})`);
        });
        return combinedUsers;
      }),
      catchError(error => {
        console.error('❌ Erreur combinaison stagiaires + RH:', error);
        return of([]);
      })
    );
  } 
 else if (this.isStagiaire(userRole)) {
  // ✅ SOLUTION BASÉE SUR LE DASHBOARD QUI FONCTIONNE
  console.log(`🎒 Stagiaire: Recherche du tuteur assigné + RH pour stagiaire ID ${userId} (méthode dashboard)`);
  
  // Récupérer le tuteur ET les RH en parallèle
  return forkJoin({
    tuteur: this.findTuteurForStagiaire(userId).pipe(
      tap(tuteur => {
        if (tuteur) {
          console.log(`👨‍🏫 Tuteur assigné trouvé: ${tuteur.firstName} ${tuteur.lastName}`);
        } else {
          console.log(`⚠️ Aucun tuteur assigné pour ce stagiaire`);
        }
      })
    ),
    rhUsers: this.userService.getUsersByRole('RHs').pipe(
      tap(rhUsers => {
        console.log(`👔 ${rhUsers.length} utilisateur(s) RH trouvé(s) pour stagiaire:`);
        rhUsers.forEach(rh => console.log(`   → ${rh.firstName} ${rh.lastName}`));
      }),
      catchError(error => {
        console.error('❌ Erreur getUsersByRole RHs pour stagiaire:', error);
        // Fallback avec 'RH' si 'RHs' ne fonctionne pas
        return this.userService.getUsersByRole('RH').pipe(
          catchError(fallbackError => {
            console.error('❌ Erreur getUsersByRole RH (fallback) pour stagiaire:', fallbackError);
            // Dernier recours: filtrage manuel des RH
            return this.userService.getAllUsers().pipe(
              map(allUsers => allUsers.filter(user => this.isRH(user.role))),
              catchError(() => of([]))
            );
          })
        );
      })
    )
  }).pipe(
    map(result => {
      // Combiner le tuteur (s'il existe) et les RH
      const availableUsers: any[] = [];
      
      // Ajouter le tuteur s'il existe
      if (result.tuteur) {
        availableUsers.push(result.tuteur);
      }
      
      // Ajouter tous les RH
      availableUsers.push(...result.rhUsers);
      
      console.log(`✅ ${availableUsers.length} utilisateur(s) disponible(s) pour Stagiaire (${result.tuteur ? '1 tuteur assigné' : '0 tuteur'} + ${result.rhUsers.length} RH):`);
      availableUsers.forEach(u => {
        const roleName = this.getRoleName(u.role);
        console.log(`   → ${u.firstName} ${u.lastName} (${roleName})`);
      });
      
      return availableUsers;
    }),
    catchError(error => {
      console.error('❌ Erreur lors de la récupération pour stagiaire:', error);
      // En cas d'erreur, retourner au moins les RH
      return this.userService.getUsersByRole('RHs').pipe(
        map(rhUsers => {
          console.log(`🔄 Fallback: Retour des RH seulement (${rhUsers.length} utilisateurs)`);
          return rhUsers;
        }),
        catchError(() => of([]))
      );
    })
  );
}
  else {
    console.log('⚠️ Rôle non reconnu:', userRole);
    console.log('🔍 Type de userRole:', typeof userRole);
    console.log('🔍 Valeur exacte:', JSON.stringify(userRole));
    return of([]);
  }
}

/**
 * 🎯 MÉTHODE SIMPLIFIÉE : Trouve le tuteur assigné à un stagiaire
 * Utilise la méthode getStagiairesByTuteur() existante en mode recherche inverse
 */


private findTuteurForStagiaire(stagiaireId: number): Observable<any | null> {
  console.log(`🔍 Recherche du tuteur pour le stagiaire ID: ${stagiaireId} (méthode dashboard)`);
  
  // ÉTAPE 1: Récupérer les informations du stagiaire pour obtenir tuteurId
  return this.userService.getUserById(stagiaireId).pipe(
    tap(stagiaire => {
      console.log('📋 Informations du stagiaire récupérées:', stagiaire);
      // ✅ CORRECTION: Vérification de type sécurisée
      const tuteurId = (stagiaire as any)?.tuteurId;
      if (tuteurId) {
        console.log(`🎯 tuteurId trouvé dans les propriétés du stagiaire: ${tuteurId}`);
      } else {
        console.log('⚠️ Pas de tuteurId trouvé dans les propriétés du stagiaire');
        console.log('🔍 Propriétés disponibles:', Object.keys(stagiaire || {}));
      }
    }),
    switchMap(stagiaire => {
      // ÉTAPE 2: Si le stagiaire a un tuteurId, récupérer le tuteur
      // ✅ CORRECTION: Vérification de type avec assertion
      const stagiaireAny = stagiaire as any;
      const tuteurId = stagiaireAny?.tuteurId;
      
      if (stagiaire && tuteurId && typeof tuteurId === 'number') {
        console.log(`👨‍🏫 Récupération du tuteur avec ID: ${tuteurId}`);
        
        return this.userService.getTuteurById(tuteurId).pipe(
          tap(tuteur => {
            if (tuteur) {
              console.log(`✅ Tuteur récupéré: ${tuteur.firstName} ${tuteur.lastName}`);
            } else {
              console.log('❌ Tuteur non trouvé avec cet ID');
            }
          }),
          catchError(error => {
            console.error('❌ Erreur lors de la récupération du tuteur par ID:', error);
            // Fallback : utiliser getUserById au lieu de getTuteurById
            console.log('🔄 Tentative avec getUserById...');
            return this.userService.getUserById(tuteurId).pipe(
              tap(user => {
                if (user) {
                  console.log(`✅ Utilisateur récupéré comme tuteur: ${user.firstName} ${user.lastName}`);
                }
              }),
              catchError(fallbackError => {
                console.error('❌ Erreur avec getUserById aussi:', fallbackError);
                return of(null);
              })
            );
          })
        );
      } else {
        // ÉTAPE 3: Si pas de tuteurId, vérifier d'autres propriétés possibles
        console.log('🔍 Recherche de propriétés alternatives...');
        
        const possibleTuteurProps = [
          'tuteur_id', 'TuteurId', 'tutor_id', 'supervisorId', 'supervisor_id'
        ];
        
        // ✅ CORRECTION: Vérification de propriétés avec assertion de type
        for (const prop of possibleTuteurProps) {
          const propValue = stagiaireAny?.[prop];
          if (stagiaire && propValue && typeof propValue === 'number') {
            console.log(`🎯 Propriété alternative trouvée: ${prop} = ${propValue}`);
            return this.userService.getUserById(propValue).pipe(
              catchError(() => of(null))
            );
          }
        }
        
        // ÉTAPE 4: Si vraiment aucun tuteurId trouvé, essayer la recherche inverse comme fallback
        console.log('🔄 Aucun tuteurId trouvé, fallback vers recherche inverse...');
        return this.searchTuteurByReverse(stagiaireId);
      }
    }),
    catchError(error => {
      console.error('❌ Erreur générale lors de la recherche du tuteur:', error);
      return of(null);
    })
  );
}

/**
 * 🔄 FALLBACK : Recherche inverse comme dernière option
 * ✅ AVEC CORRECTIONS TYPESCRIPT
 */
private searchTuteurByReverse(stagiaireId: number): Observable<any | null> {
  console.log('🔍 Recherche inverse parmi tous les tuteurs (fallback)');
  
  return this.userService.getUsersByRole('Tuteur').pipe(
    switchMap(tuteurs => {
      if (tuteurs.length === 0) {
        return of(null);
      }
      
      const checks = tuteurs.map(tuteur => 
        this.userService.getStagiairesByTuteur(tuteur.id).pipe(
          map(stagiaires => {
            const hasThisStagiaire = stagiaires.some((s: any) => s.id === stagiaireId);
            console.log(`🔍 Tuteur ${tuteur.firstName}: ${hasThisStagiaire ? '✅ A' : '❌ N\'a pas'} ce stagiaire`);
            return hasThisStagiaire ? tuteur : null;
          }),
          catchError(() => of(null))
        )
      );
      
      return forkJoin(checks).pipe(
        map(results => results.find(result => result !== null) || null)
      );
    }),
    catchError(() => of(null))
  );
}

  /**
   * Charger seulement les meetings où l'utilisateur connecté est impliqué
   */
  loadUserMeetings() {
    this.isLoading.set(true);
    
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      this.meetings.set([]);
      this.isLoading.set(false);
      return;
    }

    const filter: any = {
      userId: currentUser.id // Filtrer par l'utilisateur connecté
    };
    
    // Ajouter les autres filtres sélectionnés
    if (this.selectedType !== '') filter.type = this.selectedType;
    if (this.selectedStatus !== '') filter.status = this.selectedStatus;
    
    // Filtrer par mois actuel
    const currentDate = this.currentDate();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    filter.startDate = startOfMonth.toISOString().split('T')[0];
    filter.endDate = endOfMonth.toISOString().split('T')[0];
    
    console.log('📅 Chargement des meetings pour l\'utilisateur:', currentUser.id, 'avec filtre:', filter);
    
    this.meetingService.getMeetingsByUser(currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meetings) => {
          console.log('📋 Meetings récupérés pour l\'utilisateur:', meetings);
          // Filtrer les meetings selon les critères additionnels
          let filteredMeetings = meetings;
          
          if (this.selectedType !== '') {
            filteredMeetings = filteredMeetings.filter(m => m.type === this.selectedType);
          }
          
          if (this.selectedStatus !== '') {
            filteredMeetings = filteredMeetings.filter(m => m.status === this.selectedStatus);
          }
          
          // Filtrer par période du mois actuel
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          filteredMeetings = filteredMeetings.filter(meeting => {
            const meetingDate = new Date(meeting.date);
            return meetingDate >= startOfMonth && meetingDate <= endOfMonth;
          });
          
          this.meetings.set(filteredMeetings);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des meetings:', error);
          this.meetings.set([]);
          this.isLoading.set(false);
        }
      });
  }

  // Navigation du calendrier
  previousMonth() {
    const newDate = new Date(this.currentDate());
    newDate.setMonth(newDate.getMonth() - 1);
    this.currentDate.set(newDate);
    this.loadUserMeetings();
  }

  nextMonth() {
    const newDate = new Date(this.currentDate());
    newDate.setMonth(newDate.getMonth() + 1);
    this.currentDate.set(newDate);
    this.loadUserMeetings();
  }

  goToToday() {
    this.currentDate.set(new Date());
    this.loadUserMeetings();
  }

  getMonthYearText(): string {
    const date = this.currentDate();
    return date.toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
  }

  // Gestion des events
  selectDay(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    this.newMeeting.date = day.date.toISOString().split('T')[0];
  }

  selectMeeting(meeting: Meeting, event: Event) {
    event.stopPropagation();
    this.selectedMeeting = meeting;
  }

  showMoreMeetings(day: CalendarDay, event: Event) {
    event.stopPropagation();
    console.log('Afficher tous les meetings du', day.date, day.meetings);
  }

  // Gestion des modals
 closeCreateModal() {
  this.showCreateModal = false;
   this.isEditMode = false;
    this.editingMeetingId = null;
  this.resetNewMeeting();
  this.resetParticipantFilters(); // ← AJOUTEZ CETTE LIGNE
}

  closeDetailsModal() {
    this.selectedMeeting = null;
  }

  private resetNewMeeting() {
    const currentUser = this.authService.currentUserValue;
    this.newMeeting = {
      title: '',
      type: MeetingType.TuteurStagiaire,
      date: '',
      time: '',
      duration: 60,
      description: '',
      location: '',
      organizerId: currentUser?.id || 0,
      participantIds: []
    };
  }

  // Gestion des participants
  toggleParticipant(userId: number, event: any) {
    if (event.target.checked) {
      if (!this.newMeeting.participantIds.includes(userId)) {
        this.newMeeting.participantIds.push(userId);
      }
    } else {
      const index = this.newMeeting.participantIds.indexOf(userId);
      if (index > -1) {
        this.newMeeting.participantIds.splice(index, 1);
      }
    }
    console.log('👥 Participants sélectionnés:', this.newMeeting.participantIds);
  }

  // CRUD des meetings
  createMeeting() {
    if (!this.newMeeting.title || !this.newMeeting.date || !this.newMeeting.time) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation de la date
    const selectedDate = new Date(this.newMeeting.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      alert('Vous ne pouvez pas créer un meeting dans le passé');
      return;
    }
    
    // Validate participantIds
    if (this.newMeeting.participantIds.length === 0) {
      alert('Veuillez sélectionner au moins un participant');
      return;
    }
    
    // Clone the meeting data and ensure lowercase type
    const meetingToSend = {
      title: this.newMeeting.title,
      type: this.newMeeting.type.toLowerCase(),
      date: this.newMeeting.date,
      time: this.newMeeting.time,
      duration: this.newMeeting.duration,
      description: this.newMeeting.description || '',
      location: this.newMeeting.location || '',
      organizerId: Number(this.newMeeting.organizerId),
      participantIds: this.newMeeting.participantIds,
      status: "planifie",
      isRecurring: false
    };
    
    console.log('📤 Meeting data to send:', meetingToSend);
    
    this.isCreating = true;
    
    this.meetingService.createMeeting(meetingToSend)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meeting) => {
          console.log('✅ Meeting créé:', meeting);
          this.closeCreateModal();
          this.loadUserMeetings();
          this.isCreating = false;
          alert('Meeting créé avec succès !');
        },
        error: (error) => {
          console.error('❌ Detailed error when creating meeting:', error);
          let errorMessage = 'Erreur lors de la création du meeting';
          
          if (error.error) {
            console.error('Error details:', error.error);
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
          
          alert(errorMessage);
          this.isCreating = false;
        }
      });
  }

editMeeting(meeting: Meeting) {
  console.log('✏️ Édition du meeting:', meeting);
  
  // Activer le mode édition
  this.isEditMode = true;
  this.editingMeetingId = meeting.id!;
  
  // Pré-remplir le formulaire avec les données existantes
  this.newMeeting = {
    title: meeting.title,
    type: meeting.type,
    date: meeting.date,
    time: meeting.time,
    duration: meeting.duration,
    description: meeting.description || '',
    location: meeting.location || '',
    organizerId: meeting.organizerId,
    participantIds: meeting.participantIds || []
  };
  
  console.log('📝 Formulaire pré-rempli avec:', this.newMeeting);
  console.log('🔄 Mode édition activé pour le meeting ID:', this.editingMeetingId);
  
  // Fermer le modal de détails et ouvrir le modal de création/édition
  this.closeDetailsModal();
  this.showCreateModal = true;
}



testUpdateWithoutInterceptor() {
  if (!this.editingMeetingId) {
    console.log('❌ Pas de meeting à éditer');
    return;
  }
  
  const updateData = {
    title: this.newMeeting.title,
    type: this.newMeeting.type.toLowerCase(),
    date: this.newMeeting.date,
    time: this.newMeeting.time,
    duration: Number(this.newMeeting.duration),
    description: this.newMeeting.description || '',
    location: this.newMeeting.location || '',
    participantIds: this.newMeeting.participantIds.map(id => Number(id)),
    status: "planifie"
  };
  
  console.log('📤 Données à envoyer:', JSON.stringify(updateData, null, 2));
  
  // Utiliser fetch au lieu d'Angular HTTP pour éviter l'interceptor
  const url = `${environment.apiUrl}/api/meetings/${this.editingMeetingId}`;
  const token = localStorage.getItem('auth_token');
  
  console.log('🌐 URL:', url);
  console.log('🔑 Token présent:', !!token);
  
  fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  })
  .then(async response => {
    console.log('📊 Status Response:', response.status);
    console.log('📊 Status Text:', response.statusText);
   // console.log('📊 Headers:', [...response.headers.entries()]);
    
    const responseText = await response.text();
    console.log('📋 Response Body (text):', responseText);
    
    if (response.ok) {
      console.log('✅ Succès !');
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ JSON Response:', jsonResponse);
        alert('Meeting mis à jour avec succès !');
        this.closeCreateModal();
        this.loadUserMeetings();
      } catch (e) {
        console.log('⚠️ Réponse non-JSON mais succès');
        alert('Meeting mis à jour avec succès !');
        this.closeCreateModal();
        this.loadUserMeetings();
      }
    } else {
      console.log('❌ Erreur HTTP:', response.status, response.statusText);
      console.log('❌ Body d\'erreur:', responseText);
      
      // Essayer de parser l'erreur JSON
      try {
        const errorJson = JSON.parse(responseText);
        console.log('❌ Erreur JSON:', errorJson);
        alert(`Erreur ${response.status}: ${errorJson.message || errorJson.title || responseText}`);
      } catch (e) {
        alert(`Erreur ${response.status}: ${responseText}`);
      }
    }
  })
  .catch(error => {
    console.log('❌ Erreur network/fetch:', error);
    alert('Erreur de connexion: ' + error.message);
  })
  .finally(() => {
    this.isCreating = false;
  });
}

createOrUpdateMeeting() {
  if (!this.newMeeting.title || !this.newMeeting.date || !this.newMeeting.time) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  if (this.newMeeting.participantIds.length === 0) {
    alert('Veuillez sélectionner au moins un participant');
    return;
  }
  
  this.isCreating = true;
  
  if (this.isEditMode && this.editingMeetingId) {
    // Utiliser la méthode sans interceptor
    this.testUpdateWithoutInterceptor();
  } else {
    // MODE CRÉATION - Utiliser le service normal
    const createData = {
      title: this.newMeeting.title,
      type: this.newMeeting.type.toLowerCase(),
      date: this.newMeeting.date,
      time: this.newMeeting.time,
      duration: Number(this.newMeeting.duration),
      description: this.newMeeting.description || '',
      location: this.newMeeting.location || '',
      organizerId: Number(this.newMeeting.organizerId),
      participantIds: this.newMeeting.participantIds,
      status: "planifie",
      isRecurring: false
    };
    
    this.meetingService.createMeeting(createData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('✅ Meeting créé:', result);
          alert('Meeting créé avec succès !');
          this.closeCreateModal();
          this.loadUserMeetings();
          this.isCreating = false;
        },
        error: (error) => {
          console.error('❌ Erreur création:', error);
          alert('Erreur lors de la création : ' + (error.message || 'Erreur inconnue'));
          this.isCreating = false;
        }
      });
  }
}


async testFieldByField() {
  if (!this.editingMeetingId) {
    alert('Pas de meeting à éditer');
    return;
  }
  
  const url = `${environment.apiUrl}/api/meetings/${this.editingMeetingId}`;
  const token = localStorage.getItem('auth_token');
  
  const testCases = [
    // Test 1: Seulement le titre
    { title: "Test 1" },
    
    // Test 2: Titre + Type
    { title: "Test 2", type: "tuteur-stagiaire" },
    
    // Test 3: Titre + Type + Date
    { title: "Test 3", type: "tuteur-stagiaire", date: "2025-05-30" },
    
    // Test 4: Titre + Type + Date + Time
    { title: "Test 4", type: "tuteur-stagiaire", date: "2025-05-30", time: "14:00" },
    
    // Test 5: Ajouter Duration
    { title: "Test 5", type: "tuteur-stagiaire", date: "2025-05-30", time: "14:00", duration: 60 },
    
    // Test 6: Ajouter Status
    { title: "Test 6", type: "tuteur-stagiaire", date: "2025-05-30", time: "14:00", duration: 60, status: "planifie" },
    
    // Test 7: Ajouter Description et Location
    { title: "Test 7", type: "tuteur-stagiaire", date: "2025-05-30", time: "14:00", duration: 60, status: "planifie", description: "", location: "" },
    
    // Test 8: Ajouter UN SEUL participant
    { title: "Test 8", type: "tuteur-stagiaire", date: "2025-05-30", time: "14:00", duration: 60, status: "planifie", description: "", location: "", participantIds: [this.newMeeting.participantIds[0]] },
    
    // Test 9: Tous les participants
    { title: "Test 9", type: "tuteur-stagiaire", date: "2025-05-30", time: "14:00", duration: 60, status: "planifie", description: "", location: "", participantIds: this.newMeeting.participantIds }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testData = testCases[i];
    console.log(`🧪 Test ${i + 1}:`, testData);
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        console.log(`✅ Test ${i + 1} RÉUSSI`);
        if (i === testCases.length - 1) {
          alert('🎉 Tous les tests ont réussi ! Le problème est résolu.');
          this.closeCreateModal();
          this.loadUserMeetings();
          return;
        }
      } else {
        console.log(`❌ Test ${i + 1} ÉCHOUÉ:`, response.status, responseText);
        
        // Essayer de parser l'erreur
        try {
          const errorData = JSON.parse(responseText);
          console.log(`❌ Détails Test ${i + 1}:`, errorData);
          alert(`Test ${i + 1} échoué: ${errorData.message || errorData.title || responseText}`);
        } catch (e) {
          alert(`Test ${i + 1} échoué: ${responseText}`);
        }
        
        break; // Arrêter aux premiers échec
      }
      
      // Petite pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ Erreur réseau Test ${i + 1}:`, error);
    //  alert(`Erreur réseau Test ${i + 1}: ${error.message}`);
      break;
    }
  }
}



// Test 1: Mise à jour SANS les participants
testUpdateWithoutParticipants() {
  if (!this.editingMeetingId) {
    console.log('❌ Pas de meeting à éditer');
    return;
  }
  
  // Données sans participants
  const updateDataWithoutParticipants = {
    title: this.newMeeting.title,
    type: this.newMeeting.type.toLowerCase(),
    date: this.newMeeting.date,
    time: this.newMeeting.time,
    duration: Number(this.newMeeting.duration),
    description: this.newMeeting.description || '',
    location: this.newMeeting.location || '',
    status: "planifie"
    // ✅ PAS de participantIds
  };
  
  console.log('🧪 Test SANS participants:', updateDataWithoutParticipants);
  
  const url = `${environment.apiUrl}/api/meetings/${this.editingMeetingId}`;
  const token = localStorage.getItem('auth_token');
  
  fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateDataWithoutParticipants)
  })
  .then(response => response.text().then(text => ({ status: response.status, ok: response.ok, text })))
  .then(({ status, ok, text }) => {
    console.log(`📊 Test sans participants - Status: ${status}, OK: ${ok}`);
    console.log(`📋 Response: ${text}`);
    
    if (ok) {
      alert('✅ Mise à jour SANS participants réussie !');
      this.loadUserMeetings();
    } else {
      alert(`❌ Erreur même sans participants: ${status} - ${text}`);
    }
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    alert(`Erreur: ${error.message}`);
  });
}

// Test 2: Mise à jour SEULEMENT des participants (meeting existant)
testUpdateOnlyParticipants() {
  if (!this.editingMeetingId) {
    console.log('❌ Pas de meeting à éditer');
    return;
  }
  
  // Seulement les participants
  const participantsOnlyData = {
    participantIds: this.newMeeting.participantIds.map(id => Number(id))
  };
  
  console.log('🧪 Test participants SEULEMENT:', participantsOnlyData);
  
  const url = `${environment.apiUrl}/api/meetings/${this.editingMeetingId}`;
  const token = localStorage.getItem('auth_token');
  
  fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(participantsOnlyData)
  })
  .then(response => response.text().then(text => ({ status: response.status, ok: response.ok, text })))
  .then(({ status, ok, text }) => {
    console.log(`📊 Test participants seulement - Status: ${status}, OK: ${ok}`);
    console.log(`📋 Response: ${text}`);
    
    if (ok) {
      alert('✅ Mise à jour des participants réussie !');
      this.loadUserMeetings();
    } else {
      alert(`❌ Erreur participants: ${status} - ${text}`);
    }
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
    alert(`Erreur: ${error.message}`);
  });
}

// Solution de contournement : Mise à jour en 2 étapes
updateMeetingInTwoSteps() {
  if (!this.editingMeetingId) {
    console.log('❌ Pas de meeting à éditer');
    return;
  }
  
  this.isCreating = true;
  
  console.log('🔄 Étape 1: Mise à jour des données de base...');
  
  // Étape 1: Mettre à jour tout sauf les participants
  const basicData = {
    title: this.newMeeting.title,
    type: this.newMeeting.type.toLowerCase(),
    date: this.newMeeting.date,
    time: this.newMeeting.time,
    duration: Number(this.newMeeting.duration),
    description: this.newMeeting.description || '',
    location: this.newMeeting.location || '',
    status: "planifie"
  };
  
  const url = `${environment.apiUrl}/api/meetings/${this.editingMeetingId}`;
  const token = localStorage.getItem('auth_token');
  
  fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(basicData)
  })
  .then(response => response.text().then(text => ({ status: response.status, ok: response.ok, text })))
  .then(({ status, ok, text }) => {
    if (ok) {
      console.log('✅ Étape 1 réussie, passage à l\'étape 2...');
      
      // Étape 2: Mettre à jour seulement les participants
      const participantsData = {
        participantIds: this.newMeeting.participantIds.map(id => Number(id))
      };
      
      return fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(participantsData)
      });
    } else {
      throw new Error(`Étape 1 échouée: ${status} - ${text}`);
    }
  })
  .then(response => response.text().then(text => ({ status: response.status, ok: response.ok, text })))
  .then(({ status, ok, text }) => {
    if (ok) {
      console.log('✅ Étape 2 réussie !');
      alert('Meeting mis à jour avec succès (en 2 étapes) !');
      this.closeCreateModal();
      this.loadUserMeetings();
    } else {
      console.log('⚠️ Étape 1 réussie mais Étape 2 échouée:', text);
      alert('Meeting partiellement mis à jour (données de base OK, mais problème avec les participants)');
      this.closeCreateModal();
      this.loadUserMeetings();
    }
  })
  .catch(error => {
    console.error('❌ Erreur during update:', error);
    alert(`Erreur: ${error.message}`);
  })
  .finally(() => {
    this.isCreating = false;
  });
}



// Ajoutez aussi cette version simplifiée pour tester juste les données de base :
testBasicUpdate() {
  if (!this.editingMeetingId) {
    alert('Pas de meeting à éditer');
    return;
  }
  
  // Données très basiques - seulement ce qui est vraiment nécessaire
  const basicData = {
    title: this.newMeeting.title,
    type: this.newMeeting.type.toLowerCase()
  };
  
  console.log('🧪 Test basique:', basicData);
  
  const url = `${environment.apiUrl}/api/meetings/${this.editingMeetingId}`;
  const token = localStorage.getItem('auth_token');
  
  fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(basicData)
  })
  .then(async response => {
    const responseText = await response.text();
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', responseText);
    
    if (response.ok) {
      alert('✅ Test basique réussi !');
    } else {
      try {
        const errorData = JSON.parse(responseText);
        alert(`❌ Test basique échoué: ${errorData.message || errorData.title || responseText}`);
      } catch (e) {
        alert(`❌ Test basique échoué: ${responseText}`);
      }
    }
  })
  .catch(error => {
    alert(`Erreur: ${error.message}`);
  });
}



/**
 * 🔧 GESTION D'ERREUR AMÉLIORÉE
 */
private handleMeetingError(error: any, operation: string) {
  let errorMessage = `Erreur lors de la ${operation} du meeting`;
  
  if (error.error) {
    console.error('Détails de l\'erreur:', error.error);
    if (error.error.message) {
      errorMessage = error.error.message;
    } else if (typeof error.error === 'string') {
      errorMessage = error.error;
    }
  }
  
  alert(errorMessage);
  this.isCreating = false;
}

  deleteMeeting(meetingId: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce meeting ?')) {
      return;
    }

    this.meetingService.deleteMeeting(meetingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('🗑️ Meeting supprimé');
          this.closeDetailsModal();
          this.loadUserMeetings();
          alert('Meeting supprimé avec succès !');
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          let errorMessage = 'Erreur lors de la suppression';
          
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          alert(errorMessage);
        }
      });
  }

  // Méthodes utilitaires
  getMeetingColor(type: string): string {
    return this.meetingService.getMeetingTypeColor(type);
  }

  getMeetingTypeLabel(type: string): string {
    return this.meetingService.getMeetingTypeLabel(type);
  }

  getMeetingStatusLabel(status: string): string {
    return this.meetingService.getMeetingStatusLabel(status);
  }

  formatTime(time: string): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  formatDate(date: string): string {
    if (!date) return '';
    
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return date;
    }
  }

  // Méthodes additionnelles utiles
  getCurrentUserRole(): string {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.role || '';
  }

 canEditMeeting(meeting: Meeting): boolean {
  const currentUser = this.authService.currentUserValue;
  if (!currentUser) {
    console.log('❌ Aucun utilisateur connecté');
    return false;
  }
  
  console.log('🔍 Vérification des droits d\'édition:');
  console.log('   - Utilisateur actuel:', currentUser.id, currentUser.firstName, currentUser.lastName);
  console.log('   - Rôle utilisateur:', currentUser.role);
  console.log('   - Organisateur du meeting:', meeting.organizerId);
  
  // Vérifier si l'utilisateur est l'organisateur
  const isOrganizer = Number(meeting.organizerId) === Number(currentUser.id);
  console.log('   - Est organisateur?', isOrganizer);
  
  // Vérifier si l'utilisateur est RH (peut tout modifier)
  const isRH = this.isRH(currentUser.role);
  console.log('   - Est RH?', isRH);
  
  const canEdit = isOrganizer || isRH;
  console.log('✅ Peut éditer:', canEdit);
  
  return canEdit;
}

/**
 * 🔧 CORRECTION : Vérifie si l'utilisateur peut supprimer un meeting
 */
canDeleteMeeting(meeting: Meeting): boolean {
  const currentUser = this.authService.currentUserValue;
  if (!currentUser) {
    console.log('❌ Aucun utilisateur connecté');
    return false;
  }
  
  console.log('🗑️ Vérification des droits de suppression:');
  console.log('   - Utilisateur actuel:', currentUser.id, currentUser.firstName, currentUser.lastName);  
  console.log('   - Rôle utilisateur:', currentUser.role, '(' + this.getRoleName(currentUser.role) + ')');
  console.log('   - Organisateur du meeting:', meeting.organizerId);
  console.log('   - Titre du meeting:', meeting.title);
  
  // Vérifier si l'utilisateur est l'organisateur
  const isOrganizer = Number(meeting.organizerId) === Number(currentUser.id);
  console.log('   - Est organisateur?', isOrganizer);
  
  // Vérifier si l'utilisateur est RH (peut tout supprimer)
  const isRH = this.isRH(currentUser.role);
  console.log('   - Est RH?', isRH);
  
  const canDelete = isOrganizer || isRH;
  console.log('✅ Peut supprimer:', canDelete);
  
  return canDelete;
}

/**
 * 🔧 MÉTHODE UTILITAIRE : Vérifie si l'utilisateur peut voir le meeting (déjà existe mais améliorée)
 */
canViewMeeting(meeting: Meeting): boolean {
  const currentUser = this.authService.currentUserValue;
  if (!currentUser) return false;
  
  // L'utilisateur peut voir le meeting s'il est:
  // 1. L'organisateur
  // 2. Un participant
  // 3. Un RH (peut tout voir)
  
  const isOrganizer = Number(meeting.organizerId) === Number(currentUser.id);
  const isParticipant = meeting.participantIds?.includes(currentUser.id) ?? false;
  const isRH = this.isRH(currentUser.role);
  
  return isOrganizer || isParticipant || isRH;
}

  getUpcomingMeetings(): Meeting[] {
    const now = new Date();
    return this.meetings().filter(meeting => {
      const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
      return meetingDateTime > now;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }

  getTodayMeetings(): Meeting[] {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    return this.meetings().filter(meeting => meeting.date === todayString)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Vérifie si l'utilisateur connecté peut voir ce meeting
   */
  private canUserViewMeeting(meeting: Meeting, currentUserId: number): boolean {
    return meeting.organizerId === currentUserId || 
           (meeting.participantIds?.includes(currentUserId) ?? false);
  }

  /**
   * Récupère le nom complet d'un utilisateur par ID
   */
getUserDisplayName(userId: number): string {
  console.log(`🔍 getUserDisplayName appelé avec ID: ${userId}`);
  
  // Chercher dans le cache
  const cachedUser = this.userCache.get(userId);
  if (cachedUser) {
    console.log('✅ Utilisateur trouvé dans le cache:', cachedUser);
    
    const firstName = cachedUser.firstName || '';
    const lastName = cachedUser.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Si pas de nom complet, utiliser username ou email
    const displayName = fullName || cachedUser.username || cachedUser.email || 'Utilisateur inconnu';
    
    // IMPORTANT: Ajouter SEULEMENT le rôle, PAS l'ID
    const role = cachedUser.role ? ` (${cachedUser.role})` : '';
    
    const result = displayName + role;  // ← AUCUN ID ici
    console.log(`🎯 Résultat final getUserDisplayName: "${result}"`);
    return result;
  }
  
  console.log(`❌ Utilisateur ${userId} non trouvé dans le cache`);
  console.log('💾 Cache contient les IDs:', Array.from(this.userCache.keys()));
  return 'Utilisateur inconnu';  // ← AUCUN ID ici non plus
}

  /**
   * Version alternative qui prend un objet utilisateur
   */
  getDisplayNameFromUser(user: any): string {
    if (!user) return 'Utilisateur inconnu';
    
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.username || user.email || 'Utilisateur inconnu';
  }

  /**
   * Méthode appelée lors du changement des filtres
   */
  onFilterChange() {
    this.loadUserMeetings();
  }

  /**
   * DEBUG: Afficher les informations de l'utilisateur connecté et ses relations
   */
  debugCurrentUser() {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      console.log('🚫 Aucun utilisateur connecté');
      return;
    }

    console.log('=== 🔍 DEBUG UTILISATEUR CONNECTÉ ===');
    console.log(`👤 Utilisateur: ${currentUser.firstName} ${currentUser.lastName}`);
    console.log(`🆔 ID: ${currentUser.id}`);
    console.log(`🎭 Rôle: ${currentUser.role}`);
    console.log(`📧 Email: ${currentUser.email}`);
    console.log(`👥 Utilisateurs disponibles: ${this.users.length}`);
    this.users.forEach(u => console.log(`   → ${u.firstName} ${u.lastName} (${u.role})`));
    console.log('=== 🔚 FIN DEBUG ===');
  }
private userCache: Map<number, any> = new Map();

  private loadAllUsersCache() {
  return new Promise<void>((resolve) => {
    console.log('💾 Chargement du cache utilisateurs...');
    
    this.userService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          console.log(`💾 Cache: ${users.length} utilisateurs chargés`);
          
          // Vider le cache existant
          this.userCache.clear();
          
          // Remplir le cache
          users.forEach(user => {
            this.userCache.set(user.id, user);
            console.log(`   → Ajouté au cache: ${user.firstName} ${user.lastName} (ID: ${user.id}, Rôle: ${user.role})`);
          });
          
          resolve();
        },
        error: (error) => {
          console.error('❌ Erreur chargement cache utilisateurs:', error);
          resolve(); // Continue même en cas d'erreur
        }
      });
  });
}

getOrganizerDisplayName(meeting: Meeting): string {
  console.log('🔍 getOrganizerDisplayName appelé avec:', meeting);
  
  if (!meeting) return 'Organisateur inconnu';
  
  // Essayer d'abord avec meeting.organizer (si disponible)
  if (meeting.organizer) {
    console.log('✅ meeting.organizer trouvé:', meeting.organizer);
    const fullName = `${meeting.organizer.firstName || ''} ${meeting.organizer.lastName || ''}`.trim();
    const displayName = fullName || meeting.organizer.username || meeting.organizer.email || 'Organisateur';
    const role = meeting.organizer.role ? ` (${meeting.organizer.role})` : '';
    const result = displayName + role;
    console.log('🎯 Résultat avec meeting.organizer:', result);
    return result;
  }
  
  // Sinon utiliser le cache
  console.log('⚠️ Pas de meeting.organizer, utilisation du cache pour ID:', meeting.organizerId);
  const result = this.getUserDisplayName(meeting.organizerId);
  console.log('🎯 Résultat avec cache:', result);
  return result;
}


/**
 * NOUVELLE MÉTHODE: Affiche UNIQUEMENT nom + rôle (méthode propre)
 */
getCleanUserDisplayName(userId: number): string {
  console.log(`🧹 getCleanUserDisplayName appelé avec ID: ${userId}`);
  
  const user = this.userCache.get(userId);
  if (!user) {
    console.log(`❌ Utilisateur ${userId} introuvable`);
    return 'Utilisateur inconnu';
  }
  
  // Construire le nom
  const parts: string[] = [];
  if (user.firstName) parts.push(user.firstName);
  if (user.lastName) parts.push(user.lastName);
  
  let displayName = parts.join(' ');
  if (!displayName) {
    displayName = user.username || user.email || 'Utilisateur';
  }
  
  // ✅ CORRECTION: Convertir le numéro de rôle en nom
  if (user.role) {
    const roleName = this.getRoleName(user.role);  // Convertit 3 → "Stagiaire"
    displayName += ` (${roleName})`;
  }
  
  console.log(`🎯 Nom généré: "${displayName}"`);
  return displayName;
}
public getRoleName(roleNumber: number | string): string {
  // Si c'est déjà un string, le retourner directement
  if (typeof roleNumber === 'string') {
    return roleNumber;
  }
  
  // Si c'est un number, le convertir
  const roleNum = Number(roleNumber);
  switch (roleNum) {
    case 1: return 'RHs';
    case 2: return 'Tuteur';  
    case 3: return 'Stagiaire';
    default: return 'Inconnu';
  }
}
private isRH(role: number | string): boolean {
  if (typeof role === 'string') {
    return role.toLowerCase() === 'rhs' || role.toLowerCase() === 'rh';
  }
  return Number(role) === 1;
}

/**
 * 🔧 VÉRIFICATION HYBRIDE: Vérifie si un rôle correspond à Tuteur
 */
private isTuteur(role: number | string): boolean {
  if (typeof role === 'string') {
    return role.toLowerCase() === 'tuteur' || role.toLowerCase() === 'tuteurs';
  }
  return Number(role) === 2;
}

/**
 * 🔧 VÉRIFICATION HYBRIDE: Vérifie si un rôle correspond à Stagiaire
 */
private isStagiaire(role: number | string): boolean {
  if (typeof role === 'string') {
    return role.toLowerCase() === 'stagiaire' || role.toLowerCase() === 'stagiaires';
  }
  return Number(role) === 3;
}

/**
 * 🔍 FILTRAGE: Filtre les utilisateurs pour les participants - VERSION DEBUG
 */
filterParticipants() {
  console.log('🔍 === DEBUT FILTRAGE PARTICIPANTS ===');
  console.log('📝 Texte de recherche:', `"${this.participantSearchText}"`);
  console.log('🎭 Filtre de rôle:', `"${this.participantRoleFilter}"`);
  console.log('👥 Utilisateurs de base:', this.users.length);
  
  let filtered = [...this.users];
  console.log('🔄 Utilisateurs après copie:', filtered.length);
  
  // Filtre par texte de recherche (nom, prénom, username, email)
  if (this.participantSearchText.trim()) {
    const searchLower = this.participantSearchText.toLowerCase().trim();
    console.log('🔍 Recherche active avec:', `"${searchLower}"`);
    
    const beforeSearchFilter = filtered.length;
    filtered = filtered.filter(user => {
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      
      const matches = firstName.includes(searchLower) ||
                     lastName.includes(searchLower) ||
                     fullName.includes(searchLower) ||
                     username.includes(searchLower) ||
                     email.includes(searchLower);
      
      console.log(`   👤 ${user.firstName} ${user.lastName}: firstName="${firstName}", lastName="${lastName}", fullName="${fullName}", matches=${matches}`);
      
      return matches;
    });
    console.log(`🔍 Après filtre texte: ${beforeSearchFilter} → ${filtered.length}`);
  }
  
  // Filtre par rôle
  if (this.participantRoleFilter) {
    console.log('🎭 Filtre de rôle actif avec:', `"${this.participantRoleFilter}"`);
    
    const beforeRoleFilter = filtered.length;
    filtered = filtered.filter(user => {
      const userRoleName = this.getRoleName(user.role);
      const matches = userRoleName.toLowerCase() === this.participantRoleFilter.toLowerCase();
      
      console.log(`   👤 ${user.firstName} ${user.lastName}: rôle brut="${user.role}", rôle converti="${userRoleName}", filtre="${this.participantRoleFilter}", matches=${matches}`);
      
      return matches;
    });
    console.log(`🎭 Après filtre rôle: ${beforeRoleFilter} → ${filtered.length}`);
  }
  
  this.filteredUsers = filtered;
  console.log(`✅ RÉSULTAT FINAL: ${filtered.length} utilisateur(s) filtrés sur ${this.users.length} total`);
  console.log('🔍 === FIN FILTRAGE PARTICIPANTS ===');
}

/**
 * 🔍 ÉVÉNEMENT: Appelé quand le texte de recherche change - VERSION DEBUG
 */
onParticipantSearchChange() {
  console.log('🔍 onParticipantSearchChange appelé, nouveau texte:', `"${this.participantSearchText}"`);
  this.filterParticipants();
}

/**
 * 🔍 ÉVÉNEMENT: Appelé quand le filtre de rôle change - VERSION DEBUG
 */
onParticipantRoleFilterChange() {
  console.log('🎭 onParticipantRoleFilterChange appelé, nouveau rôle:', `"${this.participantRoleFilter}"`);
  this.filterParticipants();
}

/**
 * 🧹 RESET: Remet à zéro les filtres de participants - VERSION DEBUG
 */
resetParticipantFilters() {
  console.log('🧹 Reset des filtres participants');
  this.participantSearchText = '';
  this.participantRoleFilter = '';
  this.filteredUsers = [...this.users];
  console.log(`✅ Filtres remis à zéro, ${this.filteredUsers.length} utilisateurs affichés`);
}
currentUser: any = null;

hasAdminAccess(): boolean {
  return this.authService.hasRole('RHs') || this.authService.hasRole('Tuteur');
}


}