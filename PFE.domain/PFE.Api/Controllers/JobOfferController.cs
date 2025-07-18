using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using System.Security.Claims;

namespace PFE.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JobOfferController : ControllerBase
    {
        private readonly IJobOfferService _jobOfferService;
        private readonly IJobOfferRecommendationService _recommendationService;
        private readonly ILogger<JobOfferController> _logger;

        // ✅ CONSTRUCTEUR CORRIGÉ - Injection des deux services
        public JobOfferController(
            IJobOfferService jobOfferService,
            IJobOfferRecommendationService recommendationService,
            ILogger<JobOfferController> logger)
        {
            _jobOfferService = jobOfferService;
            _recommendationService = recommendationService;
            _logger = logger;
        }

        /// <summary>
        /// Récupère toutes les offres d'emploi
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<JobOfferDto>>> GetAllJobOffers()
        {
            try
            {
                var jobOffers = await _jobOfferService.GetAllJobOffersAsync();
                return Ok(jobOffers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère une offre d'emploi par son ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<JobOfferDto>> GetJobOfferById(int id)
        {
            try
            {
                var jobOffer = await _jobOfferService.GetJobOfferByIdAsync(id);
                return Ok(jobOffer);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère les offres d'emploi par département
        /// </summary>
        [HttpGet("department/{departmentId}")]
        public async Task<ActionResult<IEnumerable<JobOfferDto>>> GetJobOffersByDepartment(int departmentId)
        {
            try
            {
                var jobOffers = await _jobOfferService.GetJobOffersByDepartmentAsync(departmentId);
                return Ok(jobOffers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère les offres d'emploi publiées par un utilisateur spécifique
        /// </summary>
        [HttpGet("publisher/{publisherId}")]
        public async Task<ActionResult<IEnumerable<JobOfferDto>>> GetJobOffersByPublisher(int publisherId)
        {
            try
            {
                var jobOffers = await _jobOfferService.GetJobOffersByPublisherAsync(publisherId);
                return Ok(jobOffers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère les offres d'emploi récentes
        /// </summary>
        [HttpGet("recent")]
        public async Task<ActionResult<IEnumerable<JobOfferSimpleDto>>> GetRecentJobOffers([FromQuery] int count = 10)
        {
            try
            {
                var jobOffers = await _jobOfferService.GetRecentJobOffersAsync(count);
                return Ok(jobOffers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère les offres d'emploi de l'utilisateur connecté
        /// </summary>
        [HttpGet("my-offers")]
        public async Task<ActionResult<IEnumerable<JobOfferDto>>> GetMyJobOffers()
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var jobOffers = await _jobOfferService.GetJobOffersByPublisherAsync(currentUserId);
                return Ok(jobOffers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Crée une nouvelle offre d'emploi (RH uniquement)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "RHs,Admin")]
        public async Task<ActionResult<JobOfferDto>> CreateJobOffer([FromBody] CreateJobOfferDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var currentUserId = GetCurrentUserId();
                var jobOffer = await _jobOfferService.CreateJobOfferAsync(createDto, currentUserId);

                return CreatedAtAction(
                    nameof(GetJobOfferById),
                    new { id = jobOffer.Id },
                    jobOffer);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Met à jour une offre d'emploi existante
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<JobOfferDto>> UpdateJobOffer(int id, [FromBody] UpdateJobOfferDto updateDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var currentUserId = GetCurrentUserId();
                var updatedJobOffer = await _jobOfferService.UpdateJobOfferAsync(id, updateDto, currentUserId);

                return Ok(updatedJobOffer);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Supprime une offre d'emploi
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteJobOffer(int id)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var result = await _jobOfferService.DeleteJobOfferAsync(id, currentUserId);

                if (result)
                {
                    return NoContent();
                }

                return NotFound(new { message = "Offre d'emploi non trouvée." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// ✨ NOUVEAU : Crée une offre d'emploi ET génère automatiquement les recommandations IA
        /// </summary>
        [HttpPost("with-recommendations")]
        [Authorize(Roles = "RHs,Admin")]
        public async Task<ActionResult> CreateJobOfferWithRecommendations([FromBody] CreateJobOfferWithRecommendationsRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var currentUserId = GetCurrentUserId();

                // Créer l'offre d'emploi via le service existant
                var createDto = new CreateJobOfferDto
                {
                    Title = request.Title,
                    Description = request.Description,
                    RequiredSkills = request.RequiredSkills,
                    DepartmentId = request.DepartmentId
                };

                var createdJobOffer = await _jobOfferService.CreateJobOfferAsync(createDto, currentUserId);

                // Générer automatiquement les recommandations si demandé
                List<StagiaireRecommendationDto> recommendations = null;
                if (request.GenerateRecommendations)
                {
                    try
                    {
                        _logger.LogInformation($"🔍 Génération de recommandations pour JobOffer {createdJobOffer.Id}");

                        recommendations = await _recommendationService.GenerateRecommendationsAsync(
                            createdJobOffer.Id,
                            request.TopN);

                        _logger.LogInformation($"✅ Offre créée avec {recommendations.Count} recommandations");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "⚠️ Erreur lors de la génération automatique de recommandations");
                        // On continue même si les recommandations échouent
                    }
                }

                return Ok(new
                {
                    Success = true,
                    JobOffer = createdJobOffer,
                    RecommendationsGenerated = recommendations != null,
                    RecommendationCount = recommendations?.Count ?? 0,
                    Recommendations = recommendations
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur lors de la création d'offre avec recommandations");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// ✨ NOUVEAU : Récupère une offre avec toutes ses recommandations
        /// </summary>
        [HttpGet("{id}/with-recommendations")]
        public async Task<ActionResult<JobOfferWithRecommendationsDto>> GetJobOfferWithRecommendations(int id)
        {
            try
            {
                var jobOfferWithRecommendations = await _recommendationService.GetJobOfferWithRecommendationsAsync(id);

                if (jobOfferWithRecommendations == null)
                {
                    return NotFound(new { message = $"JobOffer {id} non trouvée" });
                }

                return Ok(jobOfferWithRecommendations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Erreur lors de la récupération de JobOffer {id} avec recommandations");
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Méthode utilitaire pour récupérer l'ID de l'utilisateur connecté
        /// </summary>
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("Utilisateur non authentifié.");
            }
            return userId;
        }
    }
}