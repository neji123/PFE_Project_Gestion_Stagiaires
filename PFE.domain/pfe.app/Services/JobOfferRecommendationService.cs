using Microsoft.Extensions.Logging;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.application.Services
{
    public class JobOfferRecommendationService : IJobOfferRecommendationService
    {
        private readonly IJobOfferRecommendationRepository _recommendationRepository;
        private readonly IJobOfferRepository _jobOfferRepository;
        private readonly IRecommendationService _recommendationApiService;
        private readonly ILogger<JobOfferRecommendationService> _logger;

        public JobOfferRecommendationService(
            IJobOfferRecommendationRepository recommendationRepository,
            IJobOfferRepository jobOfferRepository,
            IRecommendationService recommendationApiService,
            ILogger<JobOfferRecommendationService> logger)
        {
            _recommendationRepository = recommendationRepository;
            _jobOfferRepository = jobOfferRepository;
            _recommendationApiService = recommendationApiService;
            _logger = logger;
        }

        public async Task<List<StagiaireRecommendationDto>> GenerateRecommendationsAsync(
            int jobOfferId,
            int topN = 5,
            bool regenerateIfExists = false)
        {
            try
            {
                _logger.LogInformation($"🔍 Génération de recommandations pour JobOffer {jobOfferId}");

                // ✅ Utiliser votre méthode existante
                var jobOffer = await _jobOfferRepository.GetByIdAsync(jobOfferId);
                if (jobOffer == null)
                {
                    throw new ArgumentException($"JobOffer {jobOfferId} non trouvée");
                }

                // Vérifier si des recommandations existent déjà
                if (!regenerateIfExists)
                {
                    var existingRecommendations = await _recommendationRepository.GetRecommendationsByJobOfferIdAsync(jobOfferId);
                    if (existingRecommendations.Any())
                    {
                        _logger.LogInformation($"📋 Recommandations existantes trouvées: {existingRecommendations.Count}");
                        return existingRecommendations.Select(r => MapToDto(r)).ToList();
                    }
                }

                // Vérifier la santé de l'API IA
                var isHealthy = await _recommendationApiService.IsRecommendationServiceHealthyAsync();
                if (!isHealthy)
                {
                    _logger.LogWarning("⚠️ Service IA indisponible");
                    throw new InvalidOperationException("Service de recommandation IA indisponible. Vérifiez que le service Python est démarré sur le port 5000.");
                }

                // ✅ Utiliser les classes du namespace PFE.domain.Entities
                var apiRequest = new RecommendationRequest
                {
                    JobOfferId = jobOfferId,
                    Title = jobOffer.Title,
                    Description = jobOffer.Description,
                    RequiredSkills = jobOffer.RequiredSkills,
                    DepartmentId = jobOffer.DepartmentId,
                    TopN = topN
                };

                // Appeler l'API IA
                var apiResponse = await _recommendationApiService.GetRecommendationsAsync(apiRequest);

                if (!apiResponse.Success)
                {
                    _logger.LogError($"❌ API IA a échoué: {apiResponse.Error}");
                    throw new InvalidOperationException($"Erreur de l'API IA: {apiResponse.Error}");
                }

                if (apiResponse.Recommendations?.Count == 0)
                {
                    _logger.LogWarning($"⚠️ Aucune recommandation générée pour JobOffer {jobOfferId}");
                    return new List<StagiaireRecommendationDto>();
                }

                // Supprimer les anciennes recommandations si regeneration
                if (regenerateIfExists)
                {
                    await _recommendationRepository.DeleteRecommendationsByJobOfferIdAsync(jobOfferId);
                }

                // Sauvegarder les nouvelles recommandations
                var savedRecommendations = new List<JobOfferRecommendation>();

                for (int i = 0; i < apiResponse.Recommendations.Count; i++)
                {
                    var apiRec = apiResponse.Recommendations[i];

                    var recommendation = new JobOfferRecommendation
                    {
                        JobOfferId = jobOfferId,
                        StagiaireId = apiRec.StagiaireId,
                        StagiaireEmail = apiRec.Email,
                        StagiaireeName = apiRec.Name,
                        Skills = apiRec.Skills,
                        Department = apiRec.Department,
                        University = apiRec.University,
                        CompositeScore = apiRec.CompositeScore,
                        SkillSimilarity = apiRec.SkillSimilarity,
                        TextSimilarity = apiRec.TextSimilarity,
                        DepartmentMatch = apiRec.DepartmentMatch,
                        RecommendationRank = i + 1,
                        MatchReasons = string.Join(";", apiRec.MatchReasons),
                        GeneratedAt = DateTime.UtcNow,
                        IsViewed = false,
                        IsContacted = false,
                        IsSelected = false,
                        IsActive = true
                    };

                    var saved = await _recommendationRepository.CreateAsync(recommendation);
                    savedRecommendations.Add(saved);
                }

                _logger.LogInformation($"✅ {savedRecommendations.Count} recommandations sauvegardées pour JobOffer {jobOfferId}");

                return savedRecommendations.Select(r => MapToDto(r)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Erreur lors de la génération de recommandations pour JobOffer {jobOfferId}");
                throw;
            }
        }

        public async Task<JobOfferWithRecommendationsDto?> GetJobOfferWithRecommendationsAsync(int jobOfferId)
        {
            try
            {
                var jobOffer = await _jobOfferRepository.GetByIdAsync(jobOfferId);
                if (jobOffer == null)
                {
                    return null;
                }

                var recommendations = await _recommendationRepository.GetRecommendationsByJobOfferIdAsync(jobOfferId);

                return new JobOfferWithRecommendationsDto
                {
                    Id = jobOffer.Id,
                    Title = jobOffer.Title,
                    Description = jobOffer.Description,
                    RequiredSkills = jobOffer.RequiredSkills,
                    DepartmentId = jobOffer.DepartmentId,
                    DepartmentName = jobOffer.Department?.DepartmentName ?? "N/A", // ✅ Utiliser la navigation property
                    PublishedAt = jobOffer.PublishedAt,
                    RecommendationsGenerated = recommendations.Any(),
                    LastRecommendationGeneratedAt = recommendations.Any() ? recommendations.Max(r => r.GeneratedAt) : null,
                    RecommendationCount = recommendations.Count,
                    Recommendations = recommendations.Select(r => MapToDto(r)).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Erreur lors de la récupération de JobOffer {jobOfferId} avec recommandations");
                throw;
            }
        }

        public async Task<StagiaireRecommendationDto> UpdateRecommendationStatusAsync(
            int recommendationId,
            UpdateRecommendationStatusRequest request)
        {
            try
            {
                var recommendation = await _recommendationRepository.GetByIdAsync(recommendationId);
                if (recommendation == null)
                {
                    throw new ArgumentException($"Recommandation {recommendationId} non trouvée");
                }

                // Mettre à jour les statuts
                if (request.IsViewed.HasValue)
                    recommendation.IsViewed = request.IsViewed.Value;

                if (request.IsContacted.HasValue)
                    recommendation.IsContacted = request.IsContacted.Value;

                if (request.IsSelected.HasValue)
                    recommendation.IsSelected = request.IsSelected.Value;

                if (!string.IsNullOrEmpty(request.Notes))
                    recommendation.Notes = request.Notes;

                var updated = await _recommendationRepository.UpdateAsync(recommendation);

                _logger.LogInformation($"✅ Statut mis à jour pour recommandation {recommendationId}");

                return MapToDto(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Erreur lors de la mise à jour du statut de recommandation {recommendationId}");
                throw;
            }
        }

        public async Task<bool> DeleteRecommendationsAsync(int jobOfferId)
        {
            try
            {
                await _recommendationRepository.DeleteRecommendationsByJobOfferIdAsync(jobOfferId);
                _logger.LogInformation($"✅ Recommandations supprimées pour JobOffer {jobOfferId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Erreur lors de la suppression des recommandations pour JobOffer {jobOfferId}");
                return false;
            }
        }

        public async Task<List<JobOfferWithRecommendationsDto>> GetAllJobOffersWithRecommendationsAsync()
        {
            try
            {
                // ✅ Utiliser votre méthode existante
                var jobOffers = await _jobOfferRepository.GetAllJobOffersAsync();
                var result = new List<JobOfferWithRecommendationsDto>();

                foreach (var jobOffer in jobOffers)
                {
                    var recommendations = await _recommendationRepository.GetRecommendationsByJobOfferIdAsync(jobOffer.Id);

                    result.Add(new JobOfferWithRecommendationsDto
                    {
                        Id = jobOffer.Id,
                        Title = jobOffer.Title,
                        Description = jobOffer.Description,
                        RequiredSkills = jobOffer.RequiredSkills,
                        DepartmentId = jobOffer.DepartmentId,
                        DepartmentName = jobOffer.Department?.DepartmentName ?? "N/A",
                        PublishedAt = jobOffer.PublishedAt,
                        RecommendationsGenerated = recommendations.Any(),
                        LastRecommendationGeneratedAt = recommendations.Any() ? recommendations.Max(r => r.GeneratedAt) : null,
                        RecommendationCount = recommendations.Count,
                        Recommendations = recommendations.Select(r => MapToDto(r)).ToList()
                    });
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erreur lors de la récupération de toutes les offres avec recommandations");
                throw;
            }
        }

        private static StagiaireRecommendationDto MapToDto(JobOfferRecommendation recommendation)
        {
            return new StagiaireRecommendationDto
            {
                Id = recommendation.Id,
                StagiaireId = recommendation.StagiaireId,
                StagiaireEmail = recommendation.StagiaireEmail,
                StagiaireeName = recommendation.StagiaireeName,
                Skills = recommendation.Skills,
                Department = recommendation.Department,
                University = recommendation.University,
                CompositeScore = recommendation.CompositeScore,
                SkillSimilarity = recommendation.SkillSimilarity,
                TextSimilarity = recommendation.TextSimilarity,
                DepartmentMatch = recommendation.DepartmentMatch,
                RecommendationRank = recommendation.RecommendationRank,
                MatchReasons = recommendation.MatchReasons?.Split(';', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
                GeneratedAt = recommendation.GeneratedAt,
                IsViewed = recommendation.IsViewed,
                IsContacted = recommendation.IsContacted,
                IsSelected = recommendation.IsSelected,
                Notes = recommendation.Notes
            };
        }
    }
}