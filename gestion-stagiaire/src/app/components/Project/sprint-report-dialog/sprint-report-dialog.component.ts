import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface SprintReportDialogData {
  stagiaireFullName?: string;
  isForOthers?: boolean;
}

export interface SprintReportFormData {
  learnings: string;
  skills: string;
  difficulties: string;
}

@Component({
  selector: 'app-sprint-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="sprint-report-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon class="dialog-icon">assessment</mat-icon>
          {{ data.isForOthers ? 'Questionnaire pour ' + data.stagiaireFullName : 'Mon Questionnaire de Stage' }}
        </h2>
        <p class="dialog-subtitle">
          Complétez ce questionnaire pour enrichir votre rapport de sprint
        </p>
      </div>

      <form [formGroup]="reportForm" (ngSubmit)="onSubmit()" class="dialog-form">
        <mat-dialog-content class="dialog-content">
          
          <!-- Question 1: Qu'ai-je appris ? -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon class="section-icon">school</mat-icon>
              <h3>Qu'ai-je appris ?</h3>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Décrivez vos apprentissages lors de ce stage</mat-label>
              <textarea 
                matInput 
                formControlName="learnings" 
                rows="4"
                placeholder="Ex: J'ai appris à utiliser Angular, découvert les méthodes agiles, développé mes compétences en communication..."></textarea>
              <mat-hint>Partagez les connaissances et compétences que vous avez acquises</mat-hint>
              <mat-error *ngIf="reportForm.get('learnings')?.errors?.['required']">
                Ce champ est obligatoire
              </mat-error>
              <mat-error *ngIf="reportForm.get('learnings')?.errors?.['minlength']">
                Veuillez saisir au moins 50 caractères
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Question 2: Compétences mobilisées -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon class="section-icon">engineering</mat-icon>
              <h3>Compétences mobilisées</h3>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Quelles compétences avez-vous utilisées ?</mat-label>
              <textarea 
                matInput 
                formControlName="skills" 
                rows="4"
                placeholder="Ex: Programmation (C#, Angular), Gestion de projet, Travail d'équipe, Résolution de problèmes..."></textarea>
              <mat-hint>Listez les compétences techniques et transversales mobilisées</mat-hint>
              <mat-error *ngIf="reportForm.get('skills')?.errors?.['required']">
                Ce champ est obligatoire
              </mat-error>
              <mat-error *ngIf="reportForm.get('skills')?.errors?.['minlength']">
                Veuillez saisir au moins 30 caractères
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Question 3: Difficultés et solutions -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon class="section-icon">psychology</mat-icon>
              <h3>Difficultés rencontrées et solutions</h3>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Quels défis avez-vous rencontrés et comment les avez-vous surmontés ?</mat-label>
              <textarea 
                matInput 
                formControlName="difficulties" 
                rows="4"
                placeholder="Ex: Difficulté avec Entity Framework résolu grâce à la documentation et l'aide de mon tuteur..."></textarea>
              <mat-hint>Décrivez vos défis et les solutions trouvées</mat-hint>
              <mat-error *ngIf="reportForm.get('difficulties')?.errors?.['required']">
                Ce champ est obligatoire
              </mat-error>
              <mat-error *ngIf="reportForm.get('difficulties')?.errors?.['minlength']">
                Veuillez saisir au moins 30 caractères
              </mat-error>
            </mat-form-field>
          </div>

        </mat-dialog-content>

        <mat-dialog-actions class="dialog-actions">
          <button 
            mat-button 
            type="button" 
            class="cancel-button"
            (click)="onCancel()">
            <mat-icon>close</mat-icon>
            Annuler
          </button>
          
          <button 
            mat-raised-button 
            type="submit" 
            class="generate-button"
            [disabled]="reportForm.invalid || isGenerating"
            color="primary">
            <mat-spinner *ngIf="isGenerating" diameter="20" class="button-spinner"></mat-spinner>
            <mat-icon *ngIf="!isGenerating">picture_as_pdf</mat-icon>
            <span *ngIf="!isGenerating">Générer le rapport PDF</span>
            <span *ngIf="isGenerating">Génération en cours...</span>
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .sprint-report-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    .dialog-header {
      padding: 0 0 20px 0;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 20px;
    }

    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      color: #2E2E38;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .dialog-icon {
      color: #FFE600;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-subtitle {
      margin: 0;
      color: #666;
      font-size: 0.95rem;
      padding-left: 40px;
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .dialog-content {
      flex: 1;
      padding: 0 !important;
      margin: 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .form-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0f0f0;
    }

    .section-header h3 {
      margin: 0;
      color: #2E2E38;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .section-icon {
      color: #FFE600;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .full-width {
      width: 100%;
    }

    .full-width textarea {
      min-height: 100px;
      resize: vertical;
    }

    .dialog-actions {
      padding: 20px 0 0 0 !important;
      margin: 0;
      border-top: 1px solid #e0e0e0;
      justify-content: flex-end;
      gap: 12px;
    }

    .cancel-button {
      color: #666;
    }

    .cancel-button:hover {
      background-color: #f5f5f5;
    }

    .generate-button {
      background-color: #FFE600 !important;
      color: #2E2E38 !important;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .generate-button:hover:not(:disabled) {
      background-color: #E6CF00 !important;
    }

    .generate-button:disabled {
      background-color: #f0f0f0 !important;
      color: #999 !important;
    }

    .button-spinner {
      margin-right: 8px;
    }

    /* Styles pour les champs de formulaire */
    ::ng-deep .mat-mdc-form-field-outline {
      color: rgba(0, 0, 0, 0.12);
    }

    ::ng-deep .mat-mdc-form-field-focus-overlay {
      background-color: #FFE600;
      opacity: 0.04;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-outline-thick {
      color: #FFE600;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-floating-label {
      color: #FFE600;
    }

    /* Scrollbar custom */
    .dialog-content::-webkit-scrollbar {
      width: 6px;
    }

    .dialog-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    .dialog-content::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .dialog-content::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }
  `]
})
export class SprintReportDialogComponent {
  reportForm: FormGroup;
  isGenerating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SprintReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SprintReportDialogData
  ) {
    this.reportForm = this.fb.group({
      learnings: ['', [Validators.required, Validators.minLength(50)]],
      skills: ['', [Validators.required, Validators.minLength(30)]],
      difficulties: ['', [Validators.required, Validators.minLength(30)]]
    });
  }

  onSubmit(): void {
    if (this.reportForm.valid) {
      const formData: SprintReportFormData = {
        learnings: this.reportForm.get('learnings')?.value?.trim(),
        skills: this.reportForm.get('skills')?.value?.trim(),
        difficulties: this.reportForm.get('difficulties')?.value?.trim()
      };
      
      this.dialogRef.close(formData);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}