using Microsoft.AspNetCore.Mvc;
using PFE.application.Services;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LatexAttestationController : ControllerBase
    {
        private readonly ILogger<LatexAttestationController> _logger;
        private readonly LatexAttestationService _attestationService;
        private readonly IUserService _userService;

        public LatexAttestationController(
            ILogger<LatexAttestationController> logger,
            LatexAttestationService attestationService,
            IUserService userService)
        {
            _logger = logger;
            _attestationService = attestationService;
            _userService = userService;
        }

        /// <summary>
        /// Generates an attestation PDF for a specific stagiaire
        /// </summary>
        [HttpPost("generate-by-stagiaire")]
        public async Task<IActionResult> GenerateAttestationByStagiaire([FromBody] AttestationByStagiaireRequest request)
        {
            try
            {
                if (request.StagiaireId <= 0)
                {
                    return BadRequest("Stagiaire ID is required");
                }

                // Récupérer les informations du stagiaire avec les relations
                var stagiaire = await _userService.GetUserByIdAsync(request.StagiaireId);

                if (stagiaire == null || stagiaire.Role != UserRole.Stagiaire)
                {
                    return NotFound("Stagiaire not found");
                }

                if (!stagiaire.StartDate.HasValue || !stagiaire.EndDate.HasValue)
                {
                    return BadRequest("Stagiaire must have valid start and end dates");
                }

                var pdfBytes = await _attestationService.GenerateAttestationPdfForStagiaire(stagiaire);

                string sanitizedName = $"{stagiaire.FirstName}_{stagiaire.LastName}".Replace(" ", "_");
                string fileName = $"Attestation_{sanitizedName}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating LaTeX attestation for stagiaire");
                return StatusCode(500, $"An error occurred while generating the attestation: {ex.Message}");
            }
        }

        /// <summary>
        /// Original method (kept for backward compatibility)
        /// </summary>
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateAttestation([FromBody] AttestationRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.FullName))
                {
                    return BadRequest("Full name is required");
                }

                var pdfBytes = await _attestationService.GenerateAttestationPdf(
                    request.FullName,
                    request.StartDate,
                    request.EndDate
                );

                string sanitizedName = request.FullName.Replace(" ", "_");
                string fileName = $"Attestation_{sanitizedName}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating LaTeX attestation");
                return StatusCode(500, $"An error occurred while generating the attestation: {ex.Message}");
            }
        }
    }

    public class AttestationByStagiaireRequest
    {
        public int StagiaireId { get; set; }
    }

    public class AttestationRequest
    {
        public string FullName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}