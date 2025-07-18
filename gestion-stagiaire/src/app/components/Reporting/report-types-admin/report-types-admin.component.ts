// components/admin/report-types-admin/report-types-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../../../Auth/auth-service.service';
import { ReportTypeService, ReportType, CreateReportType, UpdateReportType } from '../../../services/Report/ReportType/report-type.service';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-report-types-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSlideToggleModule,
    DragDropModule,
    SidebarComponent
  ],
  templateUrl: './report-types-admin.component.html',
  styleUrls: ['./report-types-admin.component.scss']
})
export class ReportTypesAdminComponent implements OnInit {
  isSidebarVisible = true;
  reportTypes: ReportType[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Table configuration
  displayedColumns: string[] = ['order', 'name', 'daysFromStart', 'isActive', 'isAutoGenerated', 'actions'];
  
  // Form for creating/editing
  reportTypeForm: FormGroup;
  isEditing = false;
  editingId: number | null = null;
  showForm = false;
  
  // Icon options
  iconOptions = [
    { value: 'fa-file-contract', label: 'Contrat', icon: 'fa-file-contract' },
    { value: 'fa-tasks', label: 'Tâches', icon: 'fa-tasks' },
    { value: 'fa-book', label: 'Livre', icon: 'fa-book' },
    { value: 'fa-palette', label: 'Palette', icon: 'fa-palette' },
    { value: 'fa-presentation', label: 'Présentation', icon: 'fa-presentation' },
    { value: 'fa-camera', label: 'Caméra', icon: 'fa-camera' },
    { value: 'fa-file-pdf', label: 'PDF', icon: 'fa-file-pdf' },
    { value: 'fa-briefcase', label: 'Mallette', icon: 'fa-briefcase' },
    { value: 'fa-project-diagram', label: 'Diagramme', icon: 'fa-project-diagram' },
    { value: 'fa-chalkboard-teacher', label: 'Enseignement', icon: 'fa-chalkboard-teacher' },
    { value: 'fa-file', label: 'Fichier générique', icon: 'fa-file' }
  ];
  
  // Color options
  colorOptions = [
    { value: '#007bff', label: 'Bleu', color: '#007bff' },
    { value: '#28a745', label: 'Vert', color: '#28a745' },
    { value: '#dc3545', label: 'Rouge', color: '#dc3545' },
    { value: '#ffc107', label: 'Jaune', color: '#ffc107' },
    { value: '#17a2b8', label: 'Cyan', color: '#17a2b8' },
    { value: '#6f42c1', label: 'Violet', color: '#6f42c1' },
    { value: '#fd7e14', label: 'Orange', color: '#fd7e14' },
    { value: '#e83e8c', label: 'Rose', color: '#e83e8c' },
    { value: '#6c757d', label: 'Gris', color: '#6c757d' },
    { value: '#343a40', label: 'Sombre', color: '#343a40' }
  ];

  constructor(
    private reportTypeService: ReportTypeService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.reportTypeForm = this.createForm();
  }

  ngOnInit(): void {
    this.checkPermissions();
    this.loadReportTypes();
  }

  checkPermissions(): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || (currentUser.role !== 'Admin' && currentUser.role !== 'RHs')) {
      this.error = 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.';
      return;
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      daysFromStart: [0, [Validators.required]],
      isAutoGenerated: [false],
      isActive: [true],
      iconClass: ['fa-file', Validators.required],
      color: ['#007bff', Validators.required]
    });
  }

  loadReportTypes(): void {
    this.isLoading = true;
    this.reportTypeService.getAllReportTypes().subscribe({
      next: (reportTypes) => {
        this.reportTypes = reportTypes.sort((a, b) => a.displayOrder - b.displayOrder);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des types de rapports:', error);
        this.error = 'Erreur lors du chargement des types de rapports';
        this.isLoading = false;
      }
    });
  }

  showCreateForm(): void {
    this.isEditing = false;
    this.editingId = null;
    this.showForm = true;
    this.reportTypeForm.reset({
      name: '',
      description: '',
      displayOrder: this.getNextDisplayOrder(),
      daysFromStart: 0,
      isAutoGenerated: false,
      isActive: true,
      iconClass: 'fa-file',
      color: '#007bff'
    });
  }

  editReportType(reportType: ReportType): void {
    this.isEditing = true;
    this.editingId = reportType.id;
    this.showForm = true;
    this.reportTypeForm.patchValue({
      name: reportType.name,
      description: reportType.description,
      displayOrder: reportType.displayOrder,
      daysFromStart: reportType.daysFromStart,
      isAutoGenerated: reportType.isAutoGenerated,
      isActive: reportType.isActive,
      iconClass: reportType.iconClass,
      color: reportType.color
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.editingId = null;
    this.reportTypeForm.reset();
  }

  onSubmit(): void {
    if (this.reportTypeForm.invalid) return;

    const formValue = this.reportTypeForm.value;

    if (this.isEditing && this.editingId) {
      // Mise à jour
      const updateData: UpdateReportType = {
        name: formValue.name,
        description: formValue.description,
        displayOrder: formValue.displayOrder,
        daysFromStart: formValue.daysFromStart,
        isAutoGenerated: formValue.isAutoGenerated,
        isActive: formValue.isActive,
        iconClass: formValue.iconClass,
        color: formValue.color
      };

      this.reportTypeService.updateReportType(this.editingId, updateData).subscribe({
        next: () => {
          this.snackBar.open('Type de rapport mis à jour avec succès', 'Fermer', { duration: 3000 });
          this.cancelForm();
          this.loadReportTypes();
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour:', error);
          this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 5000 });
        }
      });
    } else {
      // Création
      const createData: CreateReportType = {
        name: formValue.name,
        description: formValue.description,
        displayOrder: formValue.displayOrder,
        daysFromStart: formValue.daysFromStart,
        isAutoGenerated: formValue.isAutoGenerated,
        isActive: formValue.isActive,
        iconClass: formValue.iconClass,
        color: formValue.color
      };

      this.reportTypeService.createReportType(createData).subscribe({
        next: () => {
          this.snackBar.open('Type de rapport créé avec succès', 'Fermer', { duration: 3000 });
          this.cancelForm();
          this.loadReportTypes();
        },
        error: (error) => {
          console.error('Erreur lors de la création:', error);
          this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 5000 });
        }
      });
    }
  }

  deleteReportType(reportType: ReportType): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmation de suppression',
        message: `Êtes-vous sûr de vouloir supprimer le type "${reportType.name}" ? Cette action est irréversible et affectera tous les rapports de ce type.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        isDanger: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reportTypeService.deleteReportType(reportType.id).subscribe({
          next: () => {
            this.snackBar.open('Type de rapport supprimé avec succès', 'Fermer', { duration: 3000 });
            this.loadReportTypes();
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 5000 });
          }
        });
      }
    });
  }

  toggleActive(reportType: ReportType): void {
    const updateData: UpdateReportType = {
      name: reportType.name,
      description: reportType.description,
      displayOrder: reportType.displayOrder,
      daysFromStart: reportType.daysFromStart,
      isAutoGenerated: reportType.isAutoGenerated,
      isActive: !reportType.isActive,
      iconClass: reportType.iconClass,
      color: reportType.color
    };

    this.reportTypeService.updateReportType(reportType.id, updateData).subscribe({
      next: () => {
        const action = reportType.isActive ? 'désactivé' : 'activé';
        this.snackBar.open(`Type de rapport ${action} avec succès`, 'Fermer', { duration: 3000 });
        this.loadReportTypes();
      },
      error: (error) => {
        console.error('Erreur lors du changement de statut:', error);
        this.snackBar.open('Erreur lors du changement de statut', 'Fermer', { duration: 5000 });
      }
    });
  }

  // Drag & Drop pour réorganiser
  drop(event: CdkDragDrop<ReportType[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    moveItemInArray(this.reportTypes, event.previousIndex, event.currentIndex);
    
    // Mettre à jour les ordres d'affichage
    this.reportTypes.forEach((reportType, index) => {
      const newOrder = index + 1;
      if (reportType.displayOrder !== newOrder) {
        this.reportTypeService.reorderReportType(reportType.id, newOrder).subscribe({
          next: () => {
            reportType.displayOrder = newOrder;
          },
          error: (error) => {
            console.error('Erreur lors de la réorganisation:', error);
            this.snackBar.open('Erreur lors de la réorganisation', 'Fermer', { duration: 3000 });
            this.loadReportTypes(); // Recharger pour annuler les changements
          }
        });
      }
    });
  }

  initializeDefaults(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Initialiser les types par défaut',
        message: 'Cela va créer les types de rapports standards. Continuer ?',
        confirmText: 'Initialiser',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reportTypeService.initializeDefaultReportTypes().subscribe({
          next: () => {
            this.snackBar.open('Types par défaut initialisés avec succès', 'Fermer', { duration: 3000 });
            this.loadReportTypes();
          },
          error: (error) => {
            console.error('Erreur lors de l\'initialisation:', error);
            this.snackBar.open('Erreur lors de l\'initialisation', 'Fermer', { duration: 5000 });
          }
        });
      }
    });
  }

  // Utilitaires
  getNextDisplayOrder(): number {
    if (this.reportTypes.length === 0) return 1;
    return Math.max(...this.reportTypes.map(rt => rt.displayOrder)) + 1;
  }

  getDaysText(days: number): string {
    if (days < 0) {
      return `${Math.abs(days)} jour(s) avant le début`;
    } else if (days === 0) {
      return 'Le jour du début du stage';
    } else {
      return `${days} jour(s) après le début`;
    }
  }

  onSidebarVisibilityChange(isVisible: boolean): void {
    this.isSidebarVisible = isVisible;
  }

  // Méthodes pour l'affichage
  getIconPreview(iconClass: string): string {
    return iconClass || 'fa-file';
  }

  getColorPreview(color: string): string {
    return color || '#007bff';
  }
}