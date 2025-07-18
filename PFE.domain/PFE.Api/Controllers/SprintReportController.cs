using Microsoft.AspNetCore.Mvc;
using PFE.application.Services;
using PFE.Application.Interfaces;
using PFE.Application.DTOs;
using System.Security.Claims;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SprintReportController : ControllerBase
    {
        private readonly ILogger<SprintReportController> _logger;
        private readonly SprintReportService _reportService;
        private readonly IUserService _userService;

        public SprintReportController(
            ILogger<SprintReportController> logger,
            SprintReportService reportService,
            IUserService userService)
        {
            _logger = logger;
            _reportService = reportService;
            _userService = userService;
        }

        /// <summary>
        /// Génère un rapport PDF des sprints et tâches pour un stagiaire spécifique avec questionnaire optionnel
        /// </summary>
        [HttpPost("generate/{stagiaireId}")]
        public async Task<IActionResult> GenerateSprintReport(int stagiaireId, [FromBody] SprintReportRequestDto? request = null)
        {
            try
            {
                // Vérifier que le stagiaire existe
                var stagiaire = await _userService.GetUserByIdAsync(stagiaireId);
                if (stagiaire == null || stagiaire.Role != PFE.domain.Entities.UserRole.Stagiaire)
                {
                    return NotFound("Stagiaire non trouvé");
                }

                var pdfBytes = await _reportService.GenerateSprintReportPdf(stagiaireId, request?.Questionnaire);
                string sanitizedName = $"{stagiaire.FirstName}_{stagiaire.LastName}".Replace(" ", "_");
                string fileName = $"Rapport_Sprint_{sanitizedName}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating sprint report");
                return StatusCode(500, $"An error occurred while generating the report: {ex.Message}");
            }
        }

        /// <summary>
        /// Génère un rapport PDF pour le stagiaire connecté (via JWT) avec questionnaire optionnel
        /// </summary>
        [HttpPost("generate-my-report")]
        //[Authorize(Roles = "Stagiaire")]
        public async Task<IActionResult> GenerateMySprintReport([FromBody] SprintReportRequestDto? request = null)
        {
            try
            {
                // Récupérer l'ID du stagiaire depuis le token JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized("Utilisateur non identifié");
                }

                var stagiaire = await _userService.GetUserByIdAsync(userId);
                if (stagiaire == null || stagiaire.Role != PFE.domain.Entities.UserRole.Stagiaire)
                {
                    return Forbid("Seuls les stagiaires peuvent générer ce rapport");
                }

                var pdfBytes = await _reportService.GenerateSprintReportPdf(userId, request?.Questionnaire);
                string sanitizedName = $"{stagiaire.FirstName}_{stagiaire.LastName}".Replace(" ", "_");
                string fileName = $"Mon_Rapport_Sprint_{sanitizedName}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating sprint report for current user");
                return StatusCode(500, $"An error occurred while generating your report: {ex.Message}");
            }
        }
    }
}