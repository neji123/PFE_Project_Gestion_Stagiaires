import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AttestationService } from '../../../services/LatexAttestation/attestation.service';
import { FormsModule } from '@angular/forms';

interface CompletedStagiaire {
  id: number;
  fullName: string;
  username: string;
  email: string;
  startDate: string;
  endDate: string;
  departmentName: string;
  universityName: string;
  stage: string;
  studentType: string;
  note?: number;
  tuteurName: string;
}

@Component({
  selector: 'app-latex-attestation',
  templateUrl: './latex-attestation.component.html',
  styleUrls: ['./latex-attestation.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule,FormsModule],
  providers: [AttestationService]
})
export class LatexAttestationComponent implements OnInit {
  // Mode de génération
  generationMode: 'auto' | 'manual' = 'auto';
  
  // Données pour le mode automatique
  allCompletedStagiaires: CompletedStagiaire[] = [];
  filteredStagiaires: CompletedStagiaire[] = [];
  selectedStagiaire: CompletedStagiaire | null = null;
  loadingStagiaires = false;
  
  // Filtres et recherche
  searchTerm = '';
  selectedYear: string = '';
  selectedDepartment: string = '';
  availableYears: string[] = [];
  availableDepartments: string[] = [];
  
  // Dropdown state
  isDropdownOpen = false;
  
  // Formulaire pour le mode manuel
  attestationForm!: FormGroup;
  
  // États communs
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  today = new Date();
  minDate = new Date(2020, 0, 1);
  isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private attestationService: AttestationService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCompletedStagiaires();
  }

  private initForm(): void {
    this.attestationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    }, { validators: this.dateRangeValidator.bind(this) });
  }

  private loadCompletedStagiaires(): void {
    this.loadingStagiaires = true;
    this.errorMessage = null;

    this.attestationService.getCompletedStagiaires().pipe(
      finalize(() => this.loadingStagiaires = false)
    ).subscribe({
      next: (stagiaires) => {
        this.allCompletedStagiaires = stagiaires;
        this.extractFilterOptions();
        this.applyFilters();
        console.log('Stagiaires terminés récupérés:', stagiaires);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des stagiaires:', error);
        this.errorMessage = 'Erreur lors du chargement des stagiaires terminés.';
      }
    });
  }

  private extractFilterOptions(): void {
    // Extraire les années uniques
    const years = new Set<string>();
    const departments = new Set<string>();

    this.allCompletedStagiaires.forEach(stagiaire => {
      if (stagiaire.endDate) {
        const year = new Date(stagiaire.endDate).getFullYear().toString();
        years.add(year);
      }
      if (stagiaire.departmentName && stagiaire.departmentName !== 'Non spécifié') {
        departments.add(stagiaire.departmentName);
      }
    });

    this.availableYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    this.availableDepartments = Array.from(departments).sort();
  }

  // Appliquer les filtres
  applyFilters(): void {
    let filtered = [...this.allCompletedStagiaires];

    // Filtre par recherche
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(stagiaire => 
        stagiaire.fullName.toLowerCase().includes(search) ||
        stagiaire.username.toLowerCase().includes(search) ||
        stagiaire.email.toLowerCase().includes(search) ||
        stagiaire.departmentName.toLowerCase().includes(search) ||
        stagiaire.universityName.toLowerCase().includes(search)
      );
    }

    // Filtre par année
    if (this.selectedYear) {
      filtered = filtered.filter(stagiaire => {
        const endYear = new Date(stagiaire.endDate).getFullYear().toString();
        return endYear === this.selectedYear;
      });
    }

    // Filtre par département
    if (this.selectedDepartment) {
      filtered = filtered.filter(stagiaire => 
        stagiaire.departmentName === this.selectedDepartment
      );
    }

    this.filteredStagiaires = filtered;
  }

  // Méthodes de filtre
  onSearchChange(): void {
    this.applyFilters();
    this.isDropdownOpen = this.searchTerm.length > 0 || this.filteredStagiaires.length > 0;
  }

  onYearChange(): void {
    this.applyFilters();
  }

  onDepartmentChange(): void {
    this.applyFilters();
  }

  // Méthodes dropdown
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectStagiaire(stagiaire: CompletedStagiaire): void {
    this.selectedStagiaire = stagiaire;
    this.isDropdownOpen = false;
    this.errorMessage = null;
    this.successMessage = null;
  }

  clearSelection(): void {
    this.selectedStagiaire = null;
  }

  // Réinitialiser les filtres
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedYear = '';
    this.selectedDepartment = '';
    this.applyFilters();
  }

  // Méthode pour changer de mode
  switchMode(mode: 'auto' | 'manual'): void {
    this.generationMode = mode;
    this.errorMessage = null;
    this.successMessage = null;
    this.selectedStagiaire = null;
  }

  // Génération automatique pour un stagiaire sélectionné
  generateForSelectedStagiaire(): void {
    if (!this.selectedStagiaire) {
      this.errorMessage = 'Veuillez sélectionner un stagiaire.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.attestationService.generateAttestationByStagiaire(this.selectedStagiaire.id).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: Blob) => {
        const sanitizedName = this.selectedStagiaire!.fullName.replace(/\s+/g, '_');
        const fileName = `Attestation_${sanitizedName}_${this.formatDate(new Date())}.pdf`;
        
        if (this.isBrowser) {
          this.downloadBlob(response, fileName);
        }
        
        this.successMessage = `Attestation générée avec succès pour ${this.selectedStagiaire!.fullName}!`;
      },
      error: (error) => {
        console.error('Erreur génération attestation:', error);
        this.errorMessage = error.message || 'Une erreur est survenue lors de la génération de l\'attestation.';
      }
    });
  }

  // Méthode de génération manuelle (conservée)
  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;
    
    if (this.attestationForm.invalid) {
      this.markFormGroupTouched(this.attestationForm);
      return;
    }

    const formData = this.attestationForm.value;
    this.isLoading = true;

    this.attestationService.generateAttestation(
      formData.fullName,
      formData.startDate,
      formData.endDate
    ).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response: Blob) => {
        const sanitizedName = formData.fullName.replace(/\s+/g, '_');
        const fileName = `Attestation_${sanitizedName}_${this.formatDate(new Date())}.pdf`;
        
        if (this.isBrowser) {
          this.downloadBlob(response, fileName);
        }
        
        this.successMessage = 'Attestation générée avec succès!';
        this.attestationForm.reset();
      },
      error: (error) => {
        this.errorMessage = error.message || 'Une erreur est survenue lors de la génération de l\'attestation.';
      }
    });
  }

  // Méthodes utilitaires
  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  }

  dateRangeValidator(formGroup: FormGroup): { [key: string]: boolean } | null {
    const startDate = formGroup.get('startDate')?.value;
    const endDate = formGroup.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return { dateRange: true };
    }

    return null;
  }

  get formControls() {
    return this.attestationForm.controls;
  }

  // Méthode pour formater les dates d'affichage
  formatDisplayDate(dateString: string): string {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  // Méthode pour calculer la durée du stage
  calculateDuration(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}