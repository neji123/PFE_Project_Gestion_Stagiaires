// services/Migration/migration.service.ts
import { Injectable } from '@angular/core';
import { ReportTypeService, ReportType } from '../Report/ReportType/report-type.service';
import { Observable, map, of, timer } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private readonly TIMEOUT_DURATION = 10000; // 10 secondes
  private readonly RETRY_COUNT = 2;

  constructor(private reportTypeService: ReportTypeService) {}

  /**
   * Initialise l'application avec les types de rapports
   */
  initializeApp(): Observable<boolean> {
    console.log('🔄 Tentative de chargement des types de rapports...');

    return this.reportTypeService.getActiveReportTypes().pipe(
      timeout(this.TIMEOUT_DURATION),
      retry(this.RETRY_COUNT),
      map(reportTypes => {
        if (reportTypes.length === 0) {
          console.warn('⚠️ Aucun type de rapport trouvé. L\'application va utiliser les valeurs par défaut.');
          this.handleEmptyReportTypes();
          return false;
        }
        
        console.log(`✅ Application initialisée avec ${reportTypes.length} types de rapports:`);
        reportTypes.forEach(rt => {
          console.log(`  - ${rt.name} (ID: ${rt.id}, Ordre: ${rt.displayOrder})`);
        });
        
        return true;
      }),
      catchError(error => {
        console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
        
        // Analyser le type d'erreur
        if (error.name === 'TimeoutError') {
          console.error('⏱️ Timeout: Le serveur met trop de temps à répondre');
        } else if (error.status === 0) {
          console.error('🌐 Erreur de réseau: Impossible de contacter le serveur');
        } else if (error.status >= 500) {
          console.error('🔥 Erreur serveur: Problème côté backend');
        } else if (error.status === 404) {
          console.error('🔍 Endpoint non trouvé: L\'API n\'existe pas encore');
        }
        
        // L'application peut continuer en mode dégradé
        console.warn('🔄 L\'application va fonctionner en mode de compatibilité');
        return of(false);
      })
    );
  }

  /**
   * Gère le cas où aucun type de rapport n'est trouvé
   */
  private handleEmptyReportTypes(): void {
    console.log('🛠️ Tentative d\'initialisation des types par défaut...');
    
    // Essayer d'initialiser les types par défaut
    this.reportTypeService.initializeDefaultReportTypes().subscribe({
      next: () => {
        console.log('✅ Types de rapports par défaut créés avec succès');
        
        // Recharger après création
        setTimeout(() => {
          this.reportTypeService.getActiveReportTypes().subscribe({
            next: (reportTypes) => {
              console.log(`🔄 ${reportTypes.length} types de rapports rechargés après initialisation`);
            },
            error: (error) => {
              console.error('❌ Erreur lors du rechargement:', error);
            }
          });
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'initialisation des types par défaut:', error);
        console.warn('⚠️ L\'application va utiliser le mode de compatibilité legacy');
      }
    });
  }

  /**
   * Migre les données de l'ancien format vers le nouveau
   */
  migrateReportData(oldReport: any): any {
    const migrated = { ...oldReport };

    // Migrer reportType (string) vers reportTypeId (number)
    if (migrated.reportType && typeof migrated.reportType === 'string') {
      const reportTypeId = this.reportTypeService.getReportTypeIdByLegacyName(migrated.reportType);
      if (reportTypeId) {
        migrated.reportTypeId = reportTypeId;
        migrated.reportTypeName = this.reportTypeService.getReportTypeDisplayName(reportTypeId);
        
        console.log(`🔄 Migré "${migrated.reportType}" vers ID ${reportTypeId} (${migrated.reportTypeName})`);
        
        // Garder l'ancien champ pour la compatibilité temporaire
        // delete migrated.reportType; // À décommenter plus tard
      } else {
        console.warn(`⚠️ Type de rapport legacy non reconnu: ${migrated.reportType}`);
      }
    }

    return migrated;
  }

  /**
   * Vérifie la compatibilité des données
   */
  checkDataCompatibility(data: any): { isCompatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // Vérifier la présence des nouveaux champs
    if (data.reportType && !data.reportTypeId) {
      issues.push('Format de données obsolète détecté (reportType au lieu de reportTypeId)');
    }

    // Vérifier que le type existe
    if (data.reportTypeId && !this.reportTypeService.findReportTypeById(data.reportTypeId)) {
      issues.push(`Type de rapport ${data.reportTypeId} non trouvé dans les types disponibles`);
    }

    // Vérifier les champs requis
    if (!data.reportTypeId && !data.reportType) {
      issues.push('Aucun type de rapport spécifié');
    }

    return {
      isCompatible: issues.length === 0,
      issues
    };
  }

  /**
   * Obtient des statistiques sur la migration
   */
  getMigrationStats(): Observable<any> {
    return this.reportTypeService.getAllReportTypes().pipe(
      map(reportTypes => ({
        totalReportTypes: reportTypes.length,
        activeReportTypes: reportTypes.filter(rt => rt.isActive).length,
        autoGeneratedTypes: reportTypes.filter(rt => rt.isAutoGenerated).length,
        lastUpdate: new Date().toISOString(),
        systemHealth: reportTypes.length > 0 ? 'healthy' : 'degraded'
      })),
      catchError(error => {
        return of({
          totalReportTypes: 0,
          activeReportTypes: 0,
          autoGeneratedTypes: 0,
          lastUpdate: new Date().toISOString(),
          systemHealth: 'error',
          error: error.message
        });
      })
    );
  }

  /**
   * Test de connectivité avec l'API
   */
  testApiConnectivity(): Observable<boolean> {
    console.log('🔌 Test de connectivité API...');
    
    return this.reportTypeService.getActiveReportTypes().pipe(
      timeout(5000),
      map(() => {
        console.log('✅ API accessible');
        return true;
      }),
      catchError(error => {
        console.error('❌ API non accessible:', error.message);
        return of(false);
      })
    );
  }
}