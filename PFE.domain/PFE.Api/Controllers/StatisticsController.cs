// StatisticsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PFE.API.Controllers
{
    [ApiController]
    [Route("api/statistics")]
    [Authorize]
    public class StatisticsController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IReportRepository _reportRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IUniversityRepository _universityRepository;
        public StatisticsController(
            IUserRepository userRepository,
            IReportRepository reportRepository,
            IDepartmentRepository departmentRepository,
            IUniversityRepository universityRepository)
        {
            _userRepository = userRepository;
            _reportRepository = reportRepository;
            _departmentRepository = departmentRepository;
            _universityRepository = universityRepository;
        }

        [HttpGet("department-distribution")]
        public async Task<IActionResult> GetDepartmentDistribution()
        {
            try
            {
                // Récupérer les stagiaires avec leur département
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);

                // Récupérer tous les départements pour s'assurer d'inclure même ceux sans stagiaires
                var allDepartments = await _departmentRepository.GetAllDepartmentsAsync();

                // Compter le nombre de stagiaires par département
                var distribution = allDepartments.Select(dept => new
                {
                    name = dept.DepartmentName,
                    value = stagiaires.Count(s => s.DepartmentId == dept.Id)
                }).ToList();

                return Ok(distribution);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        [HttpGet("stage-statistics")]
        public async Task<IActionResult> GetStageStatistics()
        {
            try
            {
                // Récupérer tous les stagiaires
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);

                // Définir les mois à inclure (6 derniers mois)
                var currentDate = DateTime.UtcNow;
                var months = Enumerable.Range(0, 6)
                    .Select(i => currentDate.AddMonths(-i))
                    .OrderBy(d => d.Year).ThenBy(d => d.Month)
                    .Select(d => new
                    {
                        Year = d.Year,
                        Month = d.Month,
                        Name = d.ToString("MMM")
                    })
                    .ToList();

                // Grouper les stagiaires par mois d'inscription
                var statistics = months.Select(m => new
                {
                    name = m.Name,
                    completed = stagiaires.Count(s =>
                        s.StartDate.HasValue &&
                        s.StartDate.Value.Year == m.Year &&
                        s.StartDate.Value.Month == m.Month &&
                        (s.EndDate.HasValue && s.EndDate.Value < currentDate)),
                    pending = stagiaires.Count(s =>
                        s.StartDate.HasValue &&
                        s.StartDate.Value.Year == m.Year &&
                        s.StartDate.Value.Month == m.Month &&
                        (!s.EndDate.HasValue || s.EndDate.Value >= currentDate))
                }).ToList();

                return Ok(statistics);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        [HttpGet("recent-activities")]
        public async Task<IActionResult> GetRecentActivities()
        {
            try
            {
                // Récupérer les dernières activités (par exemple, nouvelles inscriptions, rapports validés, etc.)
                var recentUsers = await _userRepository.GetRecentUsersAsync(5);
                var recentReports = await _reportRepository.GetRecentReportsAsync(5);

                var activities = new List<object>();

                // Ajouter les inscriptions récentes
                foreach (var user in recentUsers)
                {
                    string activityText = "";
                    string activityType = "user";

                    switch (user.Role)
                    {
                        case UserRole.Stagiaire:
                            activityText = "Nouveau stagiaire inscrit";
                            break;
                        case UserRole.Tuteur:
                            activityText = "Nouveau tuteur ajouté";
                            break;
                        case UserRole.RHs:
                            activityText = "Nouveau RH ajouté";
                            break;
                        default:
                            activityText = "Nouvel utilisateur ajouté";
                            break;
                    }

                    activities.Add(new
                    {
                        text = activityText,
                        time = GetTimeAgo(user.StartDate ?? DateTime.UtcNow),
                        type = activityType
                    });
                }

                // Ajouter les rapports récents
                foreach (var report in recentReports)
                {
                    string activityText = "";
                    string activityType = "document";

                    if (report.IsApproved)
                    {
                        activityText = $"Rapport '{report.Title}' validé";
                        activityType = "completion";
                    }
                    else if (report.IsRejected)
                    {
                        activityText = $"Rapport '{report.Title}' rejeté";
                        activityType = "notification";
                    }
                    else
                    {
                        activityText = $"Rapport '{report.Title}' soumis";
                    }

                    activities.Add(new
                    {
                        text = activityText,
                        time = GetTimeAgo(report.SubmissionDate),
                        type = activityType
                    });
                }

                // Trier par date (du plus récent au plus ancien) et limiter à 10 activités
                var sortedActivities = activities.OrderByDescending(a => GetDateFromTimeAgo(a.GetType().GetProperty("time").GetValue(a).ToString())).Take(10);

                return Ok(sortedActivities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        [HttpGet("dashboard/{role}")]
        public async Task<IActionResult> GetDashboardStatistics(string role)
        {
            try
            {
                switch (role.ToLower())
                {
                    case "admin":
                        return await GetAdminDashboardStatistics();
                    case "rh":
                        return await GetRhDashboardStatistics();
                    case "tuteur":
                        return await GetTuteurDashboardStatistics();
                    case "stagiaire":
                        return await GetStagiaireDashboardStatistics();
                    default:
                        return BadRequest("Rôle non reconnu");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        private async Task<IActionResult> GetRhDashboardStatistics()
        {
            // Nombre de stagiaires actifs
            var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);
            var activeStagiaires = stagiaires.Count(s => s.statuts == true);

            // Nombre de tuteurs actifs
            var tuteurs = await _userRepository.GetUsersByRoleAsync(UserRole.Tuteur);
            var activeTuteurs = tuteurs.Count(t => t.statuts == true);

            // Nombre de comptes en attente d'activation
            var allUsers = await _userRepository.GetAllAsync();
            var pendingAccounts = allUsers.Count(u => u.statuts == false);

            // Nombre de documents validés
            var reports = await _reportRepository.GetAllReportsAsync();
            var validatedDocuments = reports.Count(r => r.IsApproved);

            return Ok(new
            {
                activeStages = activeStagiaires,
                activeTuteurs = activeTuteurs,
                pendingAccounts = pendingAccounts,
                validatedDocuments = validatedDocuments
            });
        }

        private async Task<IActionResult> GetAdminDashboardStatistics()
        {
            // Nombre total d'utilisateurs
            var allUsers = await _userRepository.GetAllAsync();
            var totalUsers = allUsers.Count();

            // Nombre de tuteurs
            var tuteurs = allUsers.Count(u => u.Role == UserRole.Tuteur);

            // Nombre de stagiaires
            var stagiaires = allUsers.Count(u => u.Role == UserRole.Stagiaire);

            // Nombre de nouvelles demandes
            var newRequests = allUsers.Count(u => u.statuts == false);

            return Ok(new
            {
                totalUsers = totalUsers,
                tuteurs = tuteurs,
                stagiaires = stagiaires,
                newRequests = newRequests
            });
        }

        private async Task<IActionResult> GetTuteurDashboardStatistics()
        {
            // Récupérer l'ID du tuteur connecté depuis le token JWT
            int tuteurId = GetCurrentUserId();

            // Nombre de stagiaires assignés
            var stagiaires = await _userRepository.GetStagiairesByTuteurAsync(tuteurId);
            var stagiairesCount = stagiaires.Count();

            // Nombre de rapports en attente de validation
            var pendingReports = await _reportRepository.GetPendingReportsByApproverIdAsync(tuteurId);
            var pendingReportsCount = pendingReports.Count();

            // Nombre de tâches complétées (exemple: rapports validés)
            var approvedReports = await _reportRepository.GetReportsByApproverIdAsync(tuteurId);
            var completedTasks = approvedReports.Count(r => r.IsApproved);

            // Nombre de messages (si vous avez un système de messagerie)
            var messages = 0; // À implémenter selon votre système

            return Ok(new
            {
                stagiairesCount = stagiairesCount,
                pendingReports = pendingReportsCount,
                completedTasks = completedTasks,
                messages = messages
            });
        }

        private async Task<IActionResult> GetStagiaireDashboardStatistics()
        {
            // Récupérer l'ID du stagiaire connecté depuis le token JWT
            int stagiaireId = GetCurrentUserId();

            // Récupérer les informations du stagiaire
            var stagiaire = await _userRepository.GetByIdAsync(stagiaireId);

            // Calculer les jours restants du stage
            int remainingDays = 0;
            if (stagiaire.EndDate.HasValue)
            {
                remainingDays = Math.Max(0, (int)(stagiaire.EndDate.Value - DateTime.UtcNow).TotalDays);
            }

            // Compter les documents soumis
            var reports = await _reportRepository.GetByStagiaireAsync(stagiaireId);
            var submittedDocs = reports.Count(r => r.IsSubmitted);

            // Compter les tâches complétées (ex: rapports approuvés)
            var completedTasks = reports.Count(r => r.IsApproved);

            // Compter les tâches en attente (ex: rapports soumis mais pas encore approuvés)
            var pendingTasks = reports.Count(r => r.IsSubmitted && !r.IsApproved && !r.IsRejected);

            return Ok(new
            {
                remainingDays = remainingDays,
                submittedDocs = submittedDocs,
                completedTasks = completedTasks,
                pendingTasks = pendingTasks
            });
        }

        // Méthode utilitaire pour obtenir l'ID de l'utilisateur courant depuis le token JWT
        private int GetCurrentUserId()
        {
            var claimsIdentity = User.Identity as System.Security.Claims.ClaimsIdentity;
            var userIdClaim = claimsIdentity?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                return userId;
            }

            return 0; // Utilisateur par défaut ou non authentifié
        }

        // Méthode utilitaire pour formater les dates en "il y a X temps"
        private string GetTimeAgo(DateTime date)
        {
            var timeSpan = DateTime.UtcNow - date;

            if (timeSpan.TotalMinutes < 2)
                return "À l'instant";
            if (timeSpan.TotalMinutes < 60)
                return $"Il y a {(int)timeSpan.TotalMinutes} minutes";
            if (timeSpan.TotalHours < 24)
                return $"Il y a {(int)timeSpan.TotalHours} heures";
            if (timeSpan.TotalDays < 7)
                return $"Il y a {(int)timeSpan.TotalDays} jours";
            if (timeSpan.TotalDays < 30)
                return $"Il y a {(int)(timeSpan.TotalDays / 7)} semaines";
            if (timeSpan.TotalDays < 365)
                return $"Il y a {(int)(timeSpan.TotalDays / 30)} mois";

            return $"Il y a {(int)(timeSpan.TotalDays / 365)} ans";
        }

        // Méthode utilitaire pour convertir "il y a X temps" en DateTime approximative
        private DateTime GetDateFromTimeAgo(string timeAgo)
        {
            if (string.IsNullOrEmpty(timeAgo))
                return DateTime.UtcNow;

            if (timeAgo == "À l'instant")
                return DateTime.UtcNow;

            var parts = timeAgo.Split(' ');
            if (parts.Length < 3)
                return DateTime.UtcNow;

            if (!int.TryParse(parts[2], out int value))
                return DateTime.UtcNow;

            string unit = parts[3].ToLower();

            if (unit.StartsWith("minute"))
                return DateTime.UtcNow.AddMinutes(-value);
            if (unit.StartsWith("heure"))
                return DateTime.UtcNow.AddHours(-value);
            if (unit.StartsWith("jour"))
                return DateTime.UtcNow.AddDays(-value);
            if (unit.StartsWith("semaine"))
                return DateTime.UtcNow.AddDays(-value * 7);
            if (unit.StartsWith("mois"))
                return DateTime.UtcNow.AddMonths(-value);
            if (unit.StartsWith("an"))
                return DateTime.UtcNow.AddYears(-value);

            return DateTime.UtcNow;
        }
        [HttpGet("stage-type-distribution")]
        public async Task<IActionResult> GetStageTypeDistribution()
        {
            try
            {
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);

                // Données pour le graphique en secteurs
                var distribution = new[]
                {
            new { name = "Stage d'été", value = stagiaires.Count(s => s.stage == stage.stage_été) },
            new { name = "Stage PFE", value = stagiaires.Count(s => s.stage == stage.stage_pfe) },
            new { name = "Non spécifié", value = stagiaires.Count(s => s.stage == null) }
        };

                return Ok(distribution);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        // Distribution par niveau d'études
        [HttpGet("education-level-distribution")]
        public async Task<IActionResult> GetEducationLevelDistribution()
        {
            try
            {
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);

                // Données pour le graphique en secteurs
                var distribution = new[]
                {
            new { name = "Ingénierie", value = stagiaires.Count(s => s.etudiant == etudiant.ingénierie) },
            new { name = "Licence", value = stagiaires.Count(s => s.etudiant == etudiant.licence) },
            new { name = "Master", value = stagiaires.Count(s => s.etudiant == etudiant.master) },
            new { name = "Non spécifié", value = stagiaires.Count(s => s.etudiant == null) }
        };

                return Ok(distribution);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        // Distribution des stagiaires par université
        [HttpGet("university-distribution")]
        public async Task<IActionResult> GetUniversityDistribution()
        {
            try
            {
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);
                var universities = await _universityRepository.GetAllUniversitiesAsync();

                var distribution = universities.Select(univ => new
                {
                    name = univ.Universityname,
                    value = stagiaires.Count(s => s.UniversityId == univ.Id)
                }).ToList();

                // Ajouter une catégorie pour les stagiaires sans université assignée
                distribution.Add(new
                {
                    name = "Non spécifié",
                    value = stagiaires.Count(s => s.UniversityId == null)
                });

                return Ok(distribution);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        [HttpGet("university-by-department")]
        public async Task<IActionResult> GetUniversityByDepartment()
        {
            try
            {
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);
                var departments = await _departmentRepository.GetAllDepartmentsAsync();

                var result = new List<object>();

                foreach (var dept in departments)
                {
                    // Obtenez les stagiaires de ce département
                    var depStagiaires = stagiaires.Where(s => s.DepartmentId == dept.Id).ToList();

                    // Regroupez par université
                    var univGroups = depStagiaires
                        .Where(s => s.University != null)
                        .GroupBy(s => s.University.Universityname)
                        .Select(g => new
                        {
                            university = g.Key,
                            count = g.Count()
                        })
                        .Where(u => u.count > 0)
                        .ToList();

                    if (univGroups.Any())
                    {
                        result.Add(new
                        {
                            department = dept.DepartmentName,
                            universities = univGroups
                        });
                    }
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        // Liste des stagiaires qui terminent bientôt leur stage
        [HttpGet("ending-soon")]
        public async Task<IActionResult> GetStagiairesEndingSoon(int days = 30)
        {
            try
            {
                var today = DateTime.UtcNow;
                var endDate = today.AddDays(days);

                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);
                var endingSoon = stagiaires
                    .Where(s => s.EndDate.HasValue && s.EndDate.Value > today && s.EndDate.Value <= endDate)
                    .OrderBy(s => s.EndDate)
                    .Select(s => new
                    {
                        id = s.Id,
                        firstName = s.FirstName,
                        lastName = s.LastName,
                        endDate = s.EndDate,
                        daysLeft = (s.EndDate.Value - today).Days,
                        department = s.Department?.DepartmentName ?? "Non assigné",
                        university = s.University?.Universityname ?? "Non spécifiée",
                        stageType = s.stage?.ToString() ?? "Non spécifié",
                        educationLevel = s.etudiant?.ToString() ?? "Non spécifié"
                    })
                    .ToList();

                return Ok(endingSoon);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        // KPIs généraux pour le dashboard RH
        [HttpGet("rh-kpis")]
        public async Task<IActionResult> GetRHKPIs()
        {
            try
            {
                var allUsers = await _userRepository.GetAllAsync();
                var stagiaires = allUsers.Where(u => u.Role == UserRole.Stagiaire).ToList();
                var tuteurs = allUsers.Where(u => u.Role == UserRole.Tuteur).ToList();

                var today = DateTime.UtcNow;

                // KPIs généraux
                var result = new
                {
                    totalStagiaires = stagiaires.Count,
                    activeStagiaires = stagiaires.Count(s => s.statuts == true),
                    totalTuteurs = tuteurs.Count,
                    activeTuteurs = tuteurs.Count(t => t.statuts == true),

                    stagiairesSansTuteur = stagiaires.Count(s => s.TuteurId == null),

                    // Statistiques sur les types de stage
                    stagePFE = stagiaires.Count(s => s.stage == stage.stage_pfe),
                    stageEte = stagiaires.Count(s => s.stage == stage.stage_été),

                    // Statistiques sur les niveaux d'études
                    ingenierie = stagiaires.Count(s => s.etudiant == etudiant.ingénierie),
                    licence = stagiaires.Count(s => s.etudiant == etudiant.licence),
                    master = stagiaires.Count(s => s.etudiant == etudiant.master),

                    // Statistiques temporelles
                    finissantCeMois = stagiaires.Count(s =>
                        s.EndDate.HasValue &&
                        s.EndDate.Value.Month == today.Month &&
                        s.EndDate.Value.Year == today.Year),

                    nouveauxCeMois = stagiaires.Count(s =>
                        s.StartDate.HasValue &&
                        s.StartDate.Value.Month == today.Month &&
                        s.StartDate.Value.Year == today.Year),

                    stagiairesSansDocuments = 0, // À implémenter si vous avez une table de documents

                    // Charge de travail des tuteurs
                    tuteurMaxStagiaires = tuteurs.Count > 0
                        ? tuteurs.Max(t => t.Stagiaires.Count)
                        : 0,

                    tuteurMinStagiaires = tuteurs.Count > 0
                        ? tuteurs.Where(t => t.Stagiaires.Count > 0).Min(t => t.Stagiaires.Count)
                        : 0,

                    tuteurMoyenneStagiaires = tuteurs.Count > 0
                        ? tuteurs.Average(t => t.Stagiaires.Count)
                        : 0
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        // Répartition mensuelle des débuts et fins de stage
        [HttpGet("monthly-stage-distribution")]
        public async Task<IActionResult> GetMonthlyStageDistribution()
        {
            try
            {
                var stagiaires = await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire);
                var today = DateTime.UtcNow;

                // Définir la plage: 3 mois dans le passé, 9 mois dans le futur
                var startMonth = today.AddMonths(-3);
                var endMonth = today.AddMonths(9);

                var months = new List<DateTime>();
                for (var month = new DateTime(startMonth.Year, startMonth.Month, 1);
                     month <= new DateTime(endMonth.Year, endMonth.Month, 1);
                     month = month.AddMonths(1))
                {
                    months.Add(month);
                }

                var result = months.Select(month => new
                {
                    month = month.ToString("MMM yyyy"),
                    starting = stagiaires.Count(s =>
                        s.StartDate.HasValue &&
                        s.StartDate.Value.Month == month.Month &&
                        s.StartDate.Value.Year == month.Year),

                    ending = stagiaires.Count(s =>
                        s.EndDate.HasValue &&
                        s.EndDate.Value.Month == month.Month &&
                        s.EndDate.Value.Year == month.Year)
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }


    }
}