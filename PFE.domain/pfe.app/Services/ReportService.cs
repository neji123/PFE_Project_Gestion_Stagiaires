// PFE.Application.Services/ReportService.cs - Version mise à jour
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace PFE.Application.Services
{
    public class ReportService : IReportService
    {
        private readonly IReportRepository _reportRepository;
        private readonly IUserRepository _userRepository;
        private readonly IReportTypeRepository _reportTypeRepository;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly IConfiguration _configuration;

        public ReportService(
            IReportRepository reportRepository,
            IUserRepository userRepository,
            IReportTypeRepository reportTypeRepository,
            IWebHostEnvironment webHostEnvironment,
            IConfiguration configuration)
        {
            _reportRepository = reportRepository;
            _userRepository = userRepository;
            _reportTypeRepository = reportTypeRepository;
            _webHostEnvironment = webHostEnvironment;
            _configuration = configuration;
        }

        public async Task<ReportDto> UploadReportAsync(ReportUploadDto uploadDto)
        {
            // Vérifier que le stagiaire existe
            var stagiaire = await _userRepository.GetByIdAsync(uploadDto.StagiaireId);
            if (stagiaire == null || stagiaire.Role != UserRole.Stagiaire)
            {
                throw new Exception("Stagiaire non trouvé");
            }

            // Vérifier que le type de rapport existe
            var reportType = await _reportTypeRepository.GetByIdAsync(uploadDto.ReportTypeId);
            if (reportType == null || !reportType.IsActive)
            {
                throw new Exception("Type de rapport invalide ou inactif");
            }

            // Vérifier s'il existe déjà un rapport de ce type pour ce stagiaire
            var existingReport = await _reportRepository.GetByTypeAndStagiaireAsync(uploadDto.ReportTypeId, uploadDto.StagiaireId);
            if (existingReport != null)
            {
                // Si le rapport existe déjà, supprimer l'ancien fichier
                if (!string.IsNullOrEmpty(existingReport.FilePath) && File.Exists(existingReport.FilePath))
                {
                    File.Delete(existingReport.FilePath);
                }

                // Mettre à jour le rapport existant
                return await UpdateExistingReportAsync(existingReport, uploadDto, reportType);
            }
            else
            {
                // Créer un nouveau rapport
                return await CreateNewReportAsync(uploadDto, reportType);
            }
        }

        private async Task<ReportDto> UpdateExistingReportAsync(Report existingReport, ReportUploadDto uploadDto, ReportType reportType)
        {
            // Enregistrer le nouveau fichier
            string filePath = await SaveFileAsync(uploadDto.File, uploadDto.StagiaireId, reportType.Name);

            // Mettre à jour le rapport
            existingReport.Title = uploadDto.Title;
            existingReport.Description = uploadDto.Description;
            existingReport.FilePath = filePath;
            existingReport.SubmissionDate = DateTime.UtcNow;
            existingReport.IsSubmitted = true;
            existingReport.IsApproved = false; // Réinitialiser l'approbation
            existingReport.IsRejected = false;

            await _reportRepository.UpdateAsync(existingReport);

            return MapReportToDto(existingReport);
        }

        private async Task<ReportDto> CreateNewReportAsync(ReportUploadDto uploadDto, ReportType reportType)
        {
            // Enregistrer le fichier
            string filePath = await SaveFileAsync(uploadDto.File, uploadDto.StagiaireId, reportType.Name);

            // Obtenir le tuteur du stagiaire (s'il existe)
            var stagiaire = await _userRepository.GetByIdAsync(uploadDto.StagiaireId);
            int? approverId = stagiaire.TuteurId;

            // Créer un nouveau rapport
            var report = new Report
            {
                Title = uploadDto.Title,
                Description = uploadDto.Description,
                FilePath = filePath,
                SubmissionDate = DateTime.UtcNow,
                IsSubmitted = true,
                IsApproved = false,
                IsRejected = false,
                ReportTypeId = uploadDto.ReportTypeId,
                StagiaireId = uploadDto.StagiaireId,
                ApproverId = approverId
            };

            // Définir la date d'échéance en fonction du type de rapport
            report.DueDate = GetDueDateForReportType(reportType, stagiaire.StartDate);

            var addedReport = await _reportRepository.AddAsync(report);
            return MapReportToDto(addedReport);
        }

        private DateTime? GetDueDateForReportType(ReportType reportType, DateTime? stageStartDate)
        {
            if (!stageStartDate.HasValue)
                return null;

            return stageStartDate.Value.AddDays(reportType.DaysFromStart);
        }

        private async Task<string> SaveFileAsync(Microsoft.AspNetCore.Http.IFormFile file, int stagiaireId, string reportTypeName)
        {
            // Créer le dossier pour les rapports s'il n'existe pas
            string uploadsFolder = Path.Combine(_webHostEnvironment.WebRootPath, "uploads", "reports", stagiaireId.ToString());
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            // Générer un nom de fichier unique
            string sanitizedReportTypeName = string.Join("_", reportTypeName.Split(Path.GetInvalidFileNameChars()));
            string uniqueFileName = $"{sanitizedReportTypeName}_{DateTime.Now:yyyyMMdd_HHmmss}{Path.GetExtension(file.FileName)}";
            string filePath = Path.Combine(uploadsFolder, uniqueFileName);

            // Enregistrer le fichier
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return filePath;
        }

        public async Task<ReportDto> GetReportByIdAsync(int id)
        {
            var report = await _reportRepository.GetByIdAsync(id);
            if (report == null)
            {
                throw new Exception("Rapport non trouvé");
            }

            return MapReportToDto(report);
        }

        public async Task<IEnumerable<ReportDto>> GetReportsByStagiaireAsync(int stagiaireId)
        {
            var reports = await _reportRepository.GetByStagiaireAsync(stagiaireId);
            return reports.Select(MapReportToDto).ToList();
        }

        public async Task<ReportDto> ApproveReportAsync(int reportId, string feedback, int approverId)
        {
            var report = await _reportRepository.GetByIdAsync(reportId);
            if (report == null)
            {
                throw new Exception("Rapport non trouvé");
            }

            // Vérifier que l'approbateur est autorisé
            var approver = await _userRepository.GetByIdAsync(approverId);
            if (approver == null || (approver.Role != UserRole.Tuteur && approver.Role != UserRole.Admin && approver.Role != UserRole.RHs))
            {
                throw new Exception("Vous n'êtes pas autorisé à approuver ce rapport");
            }

            // Mettre à jour le rapport
            report.IsApproved = true;
            report.IsRejected = false;
            report.FeedbackComments = feedback;
            report.ApproverId = approverId;

            await _reportRepository.UpdateAsync(report);
            return MapReportToDto(report);
        }

        public async Task<ReportDto> RejectReportAsync(int reportId, string feedback, int approverId)
        {
            var report = await _reportRepository.GetByIdAsync(reportId);
            if (report == null)
            {
                throw new Exception("Rapport non trouvé");
            }

            // Vérifier que l'approbateur est autorisé
            var approver = await _userRepository.GetByIdAsync(approverId);
            if (approver == null || (approver.Role != UserRole.Tuteur && approver.Role != UserRole.Admin && approver.Role != UserRole.RHs))
            {
                throw new Exception("Vous n'êtes pas autorisé à évaluer ce rapport");
            }

            // Mettre à jour le rapport
            report.IsRejected = true;
            report.IsApproved = false;
            report.FeedbackComments = feedback;
            report.ApproverId = approverId;

            await _reportRepository.UpdateAsync(report);
            return MapReportToDto(report);
        }

        public async Task<ReportDto> ResubmitReportAsync(ReportResubmitDto resubmitDto)
        {
            // Récupérer le rapport rejeté
            var rejectedReport = await _reportRepository.GetByIdAsync(resubmitDto.RejectedReportId);
            if (rejectedReport == null)
            {
                throw new Exception("Le rapport rejeté n'a pas été trouvé");
            }

            if (!rejectedReport.IsRejected)
            {
                throw new Exception("Impossible de re-soumettre un rapport qui n'est pas rejeté");
            }

            // Vérifier que le type de rapport existe
            var reportType = await _reportTypeRepository.GetByIdAsync(resubmitDto.ReportTypeId);
            if (reportType == null || !reportType.IsActive)
            {
                throw new Exception("Type de rapport invalide ou inactif");
            }

            // Marquer le rapport comme remplacé
            rejectedReport.Status = "Remplacé";
            await _reportRepository.UpdateAsync(rejectedReport);

            // Créer un nouveau rapport
            var newReport = new Report
            {
                StagiaireId = resubmitDto.StagiaireId,
                ReportTypeId = resubmitDto.ReportTypeId,
                Title = resubmitDto.Title,
                Description = resubmitDto.Description,
                SubmissionDate = DateTime.UtcNow,
                IsSubmitted = true,
                IsApproved = false,
                IsRejected = false,
                PreviousReportId = resubmitDto.RejectedReportId,
                StageTimelineId = rejectedReport.StageTimelineId
            };

            // Sauvegarder le fichier
            string filePath = await SaveFileAsync(resubmitDto.File, resubmitDto.StagiaireId, reportType.Name);
            newReport.FilePath = filePath;

            // Enregistrer le nouveau rapport
            var addedReport = await _reportRepository.AddAsync(newReport);
            return MapReportToDto(addedReport);
        }

        public async Task<TimelineDto> GetStagiaireTimelineAsync(int stagiaireId)
        {
            // Récupérer la timeline du stagiaire
            var timeline = await _reportRepository.GetTimelineByStagiaireAsync(stagiaireId);

            // Si la timeline n'existe pas, créer une nouvelle timeline par défaut
            if (timeline == null)
            {
                timeline = await CreateDefaultTimelineAsync(stagiaireId);
            }

            // Récupérer tous les rapports du stagiaire
            var reports = await _reportRepository.GetByStagiaireAsync(stagiaireId);

            // Récupérer tous les types de rapports actifs
            var reportTypes = await _reportTypeRepository.GetActiveAsync();

            // Mapper la timeline vers DTO
            var timelineDto = new TimelineDto
            {
                StagiaireId = stagiaireId,
                Steps = new List<TimelineStepDto>()
            };

            // Créer les étapes basées sur les types de rapports
            foreach (var reportType in reportTypes.OrderBy(rt => rt.DisplayOrder))
            {
                var report = reports.FirstOrDefault(r => r.ReportTypeId == reportType.Id);
                var now = DateTime.UtcNow;

                // Calculer la date d'échéance
                var stagiaire = await _userRepository.GetByIdAsync(stagiaireId);
                var dueDate = GetDueDateForReportType(reportType, stagiaire?.StartDate) ?? now.AddDays(reportType.DaysFromStart);

                timelineDto.Steps.Add(new TimelineStepDto
                {
                    Id = reportType.Id.ToString(),
                    Name = reportType.Name,
                    Date = dueDate,
                    IsCompleted = report != null && report.IsSubmitted,
                    IsUpcoming = dueDate > now && (report == null || !report.IsSubmitted),
                    IsCurrent = dueDate <= now && (report == null || !report.IsSubmitted),
                    IconClass = reportType.IconClass,
                    ReportId = report?.Id,
                    ReportType = reportType.Name
                });
            }

            return timelineDto;
        }

        private async Task<StageTimeline> CreateDefaultTimelineAsync(int stagiaireId)
        {
            // Récupérer le stagiaire pour obtenir sa date de début
            var stagiaire = await _userRepository.GetByIdAsync(stagiaireId);
            if (stagiaire == null || stagiaire.Role != UserRole.Stagiaire)
            {
                throw new Exception("Stagiaire non trouvé");
            }

            // Utiliser la date de début du stage ou la date actuelle si non définie
            DateTime startDate = stagiaire.StartDate ?? DateTime.UtcNow;

            // Créer une timeline par défaut basée sur les types de rapports
            var timeline = new StageTimeline
            {
                StagiaireId = stagiaireId,
                LancementStage = startDate,
                DemandeConvention = startDate.AddDays(-7),
                RemisePlanTravail = startDate.AddDays(14),
                DepotJournalBord = startDate.AddDays(30),
                DepotBilanV1 = startDate.AddDays(45),
                Restitution = startDate.AddDays(60),
                VisiteMiParcours = startDate.AddDays(75),
                DepotBilanV2 = startDate.AddDays(90),
                DepotRapportFinal = startDate.AddDays(120)
            };

            return await _reportRepository.CreateTimelineAsync(timeline);
        }

        public async Task<bool> DeleteReportAsync(int reportId)
        {
            var report = await _reportRepository.GetByIdAsync(reportId);
            if (report == null)
            {
                throw new Exception("Rapport non trouvé");
            }

            // Supprimer le fichier
            if (!string.IsNullOrEmpty(report.FilePath) && File.Exists(report.FilePath))
            {
                File.Delete(report.FilePath);
            }

            // Supprimer le rapport
            await _reportRepository.DeleteAsync(report);
            return true;
        }

        public async Task<IEnumerable<ReportDto>> GetAllReportsAsync()
        {
            var reports = await _reportRepository.GetAllReportsAsync();
            return reports.Select(MapReportToDto).ToList();
        }

        public async Task<IEnumerable<ReportDto>> GetReportsByTuteurAsync(int tuteurId)
        {
            // Vérifier que le tuteur existe
            var tuteur = await _userRepository.GetByIdAsync(tuteurId);
            if (tuteur == null || (tuteur.Role != UserRole.Tuteur && tuteur.Role != UserRole.Admin && tuteur.Role != UserRole.RHs))
            {
                throw new Exception("Tuteur non trouvé ou permission insuffisante");
            }

            // Récupérer les rapports où ce tuteur est l'approbateur
            var reports = await _reportRepository.GetReportsByApproverIdAsync(tuteurId);
            return reports.Select(MapReportToDto).ToList();
        }

        private ReportDto MapReportToDto(Report report)
        {
            var apiBaseUrl = _configuration["ApiBaseUrl"] ?? "";
            var webPath = report.FilePath.Replace(_webHostEnvironment.WebRootPath, "").Replace("\\", "/");

            if (!webPath.StartsWith("/"))
            {
                webPath = "/" + webPath;
            }

            return new ReportDto
            {
                Id = report.Id,
                Title = report.Title,
                Description = report.Description,
                SubmissionDate = report.SubmissionDate,
                DueDate = report.DueDate,
                IsSubmitted = report.IsSubmitted,
                IsApproved = report.IsApproved,
                IsRejected = report.IsRejected,
                FeedbackComments = report.FeedbackComments,
                Status = report.Status,

                // Informations du type de rapport
                ReportTypeId = report.ReportTypeId,
                ReportTypeName = report.ReportType?.Name,
                ReportTypeDescription = report.ReportType?.Description,
                ReportTypeIconClass = report.ReportType?.IconClass,
                ReportTypeColor = report.ReportType?.Color,
                IsAutoGenerated = report.ReportType?.IsAutoGenerated ?? false,

                // Informations du stagiaire et approbateur
                StagiaireId = report.StagiaireId,
                StagiaireName = $"{report.Stagiaire?.FirstName} {report.Stagiaire?.LastName}",
                ApproverId = report.ApproverId,
                ApproverName = report.Approver != null ? $"{report.Approver.FirstName} {report.Approver.LastName}" : null,

                DownloadUrl = $"{apiBaseUrl}{webPath}",
                CreatedAt = report.CreatedAt,
                UpdatedAt = report.UpdatedAt
            };
        }
    }
}