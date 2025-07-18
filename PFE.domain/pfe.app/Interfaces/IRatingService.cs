
using PFE.application.DTOs;
using PFE.domain.Entities;

namespace PFE.application.Interfaces
{
    public interface IRatingService
    {
        // CRUD de base
        Task<RatingDetailDto> CreateRatingAsync(int evaluatorId, CreateRatingDto createRatingDto);
        Task<RatingDetailDto> UpdateRatingAsync(int ratingId, int userId, UpdateRatingDto updateRatingDto);
        Task<RatingDetailDto> GetRatingByIdAsync(int ratingId, int userId);
        Task<bool> DeleteRatingAsync(int ratingId, int userId);

        // Gestion des statuts
        Task<RatingDetailDto> SubmitRatingAsync(int ratingId, int userId);
        Task<RatingDetailDto> ApproveRatingAsync(int ratingId, int approverId, ApproveRatingDto approveDto);
        Task<RatingDetailDto> RejectRatingAsync(int ratingId, int approverId, string rejectionReason);

        // Réponses aux évaluations
        Task<RatingDetailDto> AddResponseToRatingAsync(int ratingId, int userId, RatingResponseDto responseDto);

        // Récupération de listes
        Task<PagedRatingResultDto> GetRatingsAsync(RatingFilterDto filters);
        Task<IEnumerable<RatingListDto>> GetMyRatingsAsync(int userId, EvaluationType? type = null);
        Task<IEnumerable<RatingListDto>> GetRatingsAboutMeAsync(int userId);
        Task<IEnumerable<RatingListDto>> GetPendingApprovalsAsync(int approverId);
        Task<IEnumerable<RatingListDto>> GetDraftRatingsAsync(int userId);

        // Méthodes spécifiques pour les tuteurs
        Task<IEnumerable<RatingListDto>> GetTuteurRatingsAsync(int tuteurId);
        Task<IEnumerable<RatingListDto>> GetStagiairesRatedByTuteurAsync(int tuteurId);
        Task<bool> CanTuteurRateStagiaireAsync(int tuteurId, int stagiaireId);
        Task<RatingDetailDto> RateStagiaireAsync(int tuteurId, int stagiaireId, CreateRatingDto ratingDto);

        // Méthodes spécifiques pour les stagiaires
        Task<IEnumerable<RatingListDto>> GetStagiaireRatingsAsync(int stagiaireId);
        Task<bool> CanStagiaireRateTuteurAsync(int stagiaireId, int tuteurId);
        Task<RatingDetailDto> RateTuteurAsync(int stagiaireId, int tuteurId, CreateRatingDto ratingDto);

        // Méthodes spécifiques pour RH
        Task<IEnumerable<RatingListDto>> GetRHRatingsAsync(int rhId);
        Task<bool> CanRHRateStagiaireAsync(int rhId, int stagiaireId);
        Task<RatingDetailDto> RateStagiaireAsRHAsync(int rhId, int stagiaireId, CreateRatingDto ratingDto);

        // Statistiques
        Task<RatingStatsDto> GetUserRatingStatsAsync(int userId);
        Task<RatingStatsDto> GetOverallRatingStatsAsync();
        Task<double> GetAverageRatingForUserAsync(int userId, EvaluationType? type = null);

        // Vérifications de business rules
        Task<bool> HasUserAlreadyRatedAsync(int evaluatorId, int evaluatedUserId, EvaluationType type);
        Task<bool> CanUserRateAsync(int evaluatorId, int evaluatedUserId, EvaluationType type);
        Task<IEnumerable<User>> GetUsersUserCanRateAsync(int userId);
        Task<IEnumerable<User>> GetUsersWhoCanRateUserAsync(int userId);

        // Notifications et emails
        Task SendRatingNotificationAsync(int ratingId);
        Task SendRatingApprovalNotificationAsync(int ratingId);
        Task SendRatingRejectionNotificationAsync(int ratingId, string reason);

        // Validation
        Task<bool> ValidateRatingPermissionsAsync(int evaluatorId, int evaluatedUserId, EvaluationType type);
        Task<bool> IsRatingEditableAsync(int ratingId, int userId);
        Task<IEnumerable<User>> GetUsersUserCanRateNotEvaluatedAsync(int userId);
        #region Méthodes pour consulter les évaluations d'autres utilisateurs

        /// <summary>
        /// Récupérer toutes les évaluations reçues par un utilisateur spécifique
        /// </summary>
        Task<IEnumerable<RatingListDto>> GetRatingsAboutUserAsync(int userId);

        /// <summary>
        /// Récupérer la moyenne des évaluations reçues par un utilisateur
        /// </summary>
        Task<double> GetUserAverageRatingAsync(int userId, EvaluationType? type = null);

        /// <summary>
        /// Récupérer des statistiques détaillées pour un utilisateur spécifique
        /// </summary>
        Task<RatingStatsDto> GetDetailedUserStatsAsync(int userId);

        /// <summary>
        /// Vérifier si un utilisateur peut voir les évaluations d'un autre utilisateur
        /// </summary>
        Task<bool> CanViewUserRatingsAsync(int currentUserId, int targetUserId);
        #endregion
    }
}