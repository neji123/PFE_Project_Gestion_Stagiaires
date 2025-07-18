using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Seuls les utilisateurs authentifiés peuvent accéder
    public class JobOfferRecommendationController : ControllerBase
    {
        private readonly IJobOfferRecommendationService _recommendationService;
        private readonly ILogger<JobOfferRecommendationController> _logger;
        private readonly IConfiguration _configuration;
        public JobOfferRecommendationController(
            IConfiguration configuration,
            IJobOfferRecommendationService recommendationService,
            ILogger<JobOfferRecommendationController> logger)
        {
            _configuration = configuration;
                        _recommendationService = recommendationService;
            _logger = logger;

        }

        /// <summary>
        /// Génère ou récupère les recommandations IA pour une offre d'emploi
        /// </summary>
        [HttpPost("generate")]
        public async Task<ActionResult<List<StagiaireRecommendationDto>>> GenerateRecommendations(
            [FromBody] GenerateRecommendationsRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                _logger.LogInformation($"🔍 Génération de recommandations pour JobOffer {request.JobOfferId}");

                var recommendations = await _recommendationService.GenerateRecommendationsAsync(
                    request.JobOfferId,
                    request.TopN,
                    request.RegenerateIfExists);

                _logger.LogInformation($"✅ {recommendations.Count} recommandations générées");

                return Ok(new
                {
                    Success = true,
                    JobOfferId = request.JobOfferId,
                    RecommendationCount = recommendations.Count,
                    Recommendations = recommendations
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Argument invalide pour la génération de recommandations");
                return BadRequest(new { Success = false, Error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la génération de recommandations");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Récupère une offre d'emploi avec toutes ses recommandations
        /// </summary>
        [HttpGet("job-offer/{jobOfferId}")]
        public async Task<ActionResult<JobOfferWithRecommendationsDto>> GetJobOfferWithRecommendations(int jobOfferId)
        {
            try
            {
                var jobOfferWithRecommendations = await _recommendationService.GetJobOfferWithRecommendationsAsync(jobOfferId);

                if (jobOfferWithRecommendations == null)
                {
                    return NotFound(new { Success = false, Error = $"JobOffer {jobOfferId} non trouvée" });
                }

                return Ok(jobOfferWithRecommendations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors de la récupération de JobOffer {jobOfferId} avec recommandations");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Met à jour le statut d'une recommandation (vue, contactée, sélectionnée)
        /// </summary>
        [HttpPut("status")]
        public async Task<ActionResult<StagiaireRecommendationDto>> UpdateRecommendationStatus(
            [FromBody] UpdateRecommendationStatusRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var updatedRecommendation = await _recommendationService.UpdateRecommendationStatusAsync(
                    request.RecommendationId,
                    request);

                _logger.LogInformation($"✅ Statut mis à jour pour recommandation {request.RecommendationId}");

                return Ok(updatedRecommendation);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Success = false, Error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la mise à jour du statut de recommandation");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Supprime toutes les recommandations d'une offre d'emploi
        /// </summary>
        [HttpDelete("job-offer/{jobOfferId}")]
        public async Task<ActionResult> DeleteRecommendations(int jobOfferId)
        {
            try
            {
                var success = await _recommendationService.DeleteRecommendationsAsync(jobOfferId);

                if (success)
                {
                    _logger.LogInformation($"✅ Recommandations supprimées pour JobOffer {jobOfferId}");
                    return Ok(new { Success = true, Message = "Recommandations supprimées avec succès" });
                }
                else
                {
                    return StatusCode(500, new { Success = false, Error = "Erreur lors de la suppression" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors de la suppression des recommandations pour JobOffer {jobOfferId}");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Récupère toutes les offres d'emploi avec leurs recommandations
        /// </summary>
        [HttpGet("all")]
        public async Task<ActionResult<List<JobOfferWithRecommendationsDto>>> GetAllJobOffersWithRecommendations()
        {
            try
            {
                var jobOffersWithRecommendations = await _recommendationService.GetAllJobOffersWithRecommendationsAsync();

                return Ok(new
                {
                    Success = true,
                    TotalJobOffers = jobOffersWithRecommendations.Count,
                    JobOffersWithRecommendations = jobOffersWithRecommendations
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération de toutes les offres avec recommandations");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Marque une recommandation comme vue (tracking)
        /// </summary>
        [HttpPost("{recommendationId}/mark-viewed")]
        public async Task<ActionResult> MarkAsViewed(int recommendationId)
        {
            try
            {
                var request = new UpdateRecommendationStatusRequest
                {
                    RecommendationId = recommendationId,
                    IsViewed = true
                };

                await _recommendationService.UpdateRecommendationStatusAsync(recommendationId, request);

                return Ok(new { Success = true, Message = "Recommandation marquée comme vue" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors du marquage comme vue pour recommandation {recommendationId}");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Marque une recommandation comme contactée
        /// </summary>
        [HttpPost("{recommendationId}/mark-contacted")]
        public async Task<ActionResult> MarkAsContacted(int recommendationId, [FromBody] string notes = null)
        {
            try
            {
                var request = new UpdateRecommendationStatusRequest
                {
                    RecommendationId = recommendationId,
                    IsContacted = true,
                    Notes = notes
                };

                await _recommendationService.UpdateRecommendationStatusAsync(recommendationId, request);

                return Ok(new { Success = true, Message = "Recommandation marquée comme contactée" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors du marquage comme contactée pour recommandation {recommendationId}");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Sélectionne un candidat pour une offre d'emploi
        /// </summary>
        [HttpPost("{recommendationId}/select")]
        public async Task<ActionResult> SelectCandidate(int recommendationId, [FromBody] string notes = null)
        {
            try
            {
                var request = new UpdateRecommendationStatusRequest
                {
                    RecommendationId = recommendationId,
                    IsSelected = true,
                    Notes = notes
                };

                await _recommendationService.UpdateRecommendationStatusAsync(recommendationId, request);

                _logger.LogInformation($"🎯 Candidat sélectionné pour recommandation {recommendationId}");

                return Ok(new { Success = true, Message = "Candidat sélectionné avec succès" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors de la sélection du candidat pour recommandation {recommendationId}");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }

        /// <summary>
        /// Statistiques sur les recommandations
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult> GetRecommendationStats()
        {
            try
            {
                var allJobOffers = await _recommendationService.GetAllJobOffersWithRecommendationsAsync();

                var stats = new
                {
                    TotalJobOffers = allJobOffers.Count,
                    JobOffersWithRecommendations = allJobOffers.Count(jo => jo.RecommendationsGenerated),
                    TotalRecommendations = allJobOffers.SelectMany(jo => jo.Recommendations).Count(),
                    ViewedRecommendations = allJobOffers.SelectMany(jo => jo.Recommendations).Count(r => r.IsViewed),
                    ContactedRecommendations = allJobOffers.SelectMany(jo => jo.Recommendations).Count(r => r.IsContacted),
                    SelectedRecommendations = allJobOffers.SelectMany(jo => jo.Recommendations).Count(r => r.IsSelected),
                    AverageRecommendationsPerJobOffer = allJobOffers.Count > 0 ?
                        allJobOffers.Where(jo => jo.RecommendationsGenerated).Average(jo => jo.RecommendationCount) : 0
                };

                return Ok(new { Success = true, Stats = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des statistiques");
                return StatusCode(500, new { Success = false, Error = "Erreur interne du serveur" });
            }
        }
        [HttpGet("test-python-connection")]
        public async Task<ActionResult> TestPythonConnection()
        {
            try
            {
                var pythonUrl = _configuration["RecommendationAPI:BaseUrl"];
                _logger.LogInformation($"🔧 Test connexion Python vers: {pythonUrl}");

                // Récupérer le service via DI
                var recommendationService = HttpContext.RequestServices.GetRequiredService<IRecommendationService>();

                var isHealthy = await recommendationService.IsRecommendationServiceHealthyAsync();

                if (isHealthy)
                {
                    return Ok(new
                    {
                        Success = true,
                        Message = "✅ Connexion Python OK",
                        PythonApiUrl = pythonUrl,
                        Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    });
                }
                else
                {
                    return StatusCode(503, new
                    {
                        Success = false,
                        Error = "❌ API Python indisponible - Vérifiez que le service Python est démarré",
                        PythonApiUrl = pythonUrl,
                        Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du test de connexion Python");
                return StatusCode(500, new
                {
                    Success = false,
                    Error = $"Erreur interne: {ex.Message}",
                    PythonApiUrl = _configuration["RecommendationAPI:BaseUrl"],
                    Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                });
            }
        }


    }
}

