// =======================================
// IRatingRepository.cs
// =======================================
using PFE.domain.Entities;
using PFE.application.DTOs;

namespace PFE.application.Interfaces
{
    public interface IRatingRepository
    {
        // CRUD de base
        Task<Rating> GetByIdAsync(int id);
        Task<Rating> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<Rating>> GetAllAsync();
        Task<Rating> AddAsync(Rating rating);
        Task<Rating> UpdateAsync(Rating rating);
        Task<bool> DeleteAsync(int id);

        // Requêtes spécifiques
        Task<IEnumerable<Rating>> GetRatingsByEvaluatorAsync(int evaluatorId);
        Task<IEnumerable<Rating>> GetRatingsByEvaluatedUserAsync(int evaluatedUserId);
        Task<IEnumerable<Rating>> GetRatingsByTypeAsync(EvaluationType type);
        Task<IEnumerable<Rating>> GetRatingsByStatusAsync(RatingStatus status);

        // Recherche avancée avec filtres
        Task<(IEnumerable<Rating> ratings, int totalCount)> GetRatingsWithFiltersAsync(RatingFilterDto filters);

        // Vérifications de business rules
        Task<bool> HasUserAlreadyRatedAsync(int evaluatorId, int evaluatedUserId, EvaluationType type, DateTime? periodStart = null, DateTime? periodEnd = null);
        Task<bool> CanUserRateAsync(int evaluatorId, int evaluatedUserId, EvaluationType type);
        Task<Rating?> GetExistingRatingAsync(int evaluatorId, int evaluatedUserId, EvaluationType type, DateTime? periodStart = null, DateTime? periodEnd = null);

        // Statistiques
        Task<double> GetAverageRatingForUserAsync(int userId, EvaluationType? type = null);
        Task<int> GetTotalRatingsCountAsync(int? userId = null, EvaluationType? type = null);
        Task<Dictionary<int, int>> GetScoreDistributionAsync(int? userId = null, EvaluationType? type = null);
        Task<RatingStatsDto> GetRatingStatsAsync(int? userId = null, EvaluationType? type = null);

        // Méthodes pour la gestion des statuts
        Task<IEnumerable<Rating>> GetPendingApprovalsAsync();
        Task<IEnumerable<Rating>> GetDraftRatingsAsync(int userId);
        Task<IEnumerable<Rating>> GetRatingsAwaitingResponseAsync(int userId);

        // Méthodes pour les relations tuteur-stagiaire
        Task<IEnumerable<Rating>> GetTuteurRatingsForStagiaireAsync(int tuteurId, int stagiaireId);
        Task<IEnumerable<Rating>> GetStagiaireRatingsForTuteurAsync(int stagiaireId, int tuteurId);
        Task<IEnumerable<Rating>> GetAllRatingsForStagiaireAsync(int stagiaireId);
        Task<IEnumerable<Rating>> GetAllRatingsFromTuteurAsync(int tuteurId);

        // Méthodes pour RH
        Task<IEnumerable<Rating>> GetRatingsRequiringRHApprovalAsync();
        Task<IEnumerable<Rating>> GetRHRatingsForStagiaireAsync(int rhId, int stagiaireId);
        Task<IEnumerable<Rating>> GetAllApprovedRatingsAsync();
        Task<List<int>> GetEvaluatedUserIdsByEvaluatorAsync(int evaluatorId, bool excludeRejected = true);

    }
}

