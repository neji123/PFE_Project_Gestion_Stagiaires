using System.ComponentModel.DataAnnotations;
using PFE.domain.Entities;

namespace PFE.application.DTOs
{
    // DTO pour créer une nouvelle évaluation
    public class CreateRatingDto
    {
        [Required]
        public int EvaluatedUserId { get; set; }

        [Required]
        [Range(1, 5, ErrorMessage = "La note doit être entre 1 et 5")]
        public double Score { get; set; }

        [Required]
        [MaxLength(1000, ErrorMessage = "Le commentaire ne peut pas dépasser 1000 caractères")]
        public string Comment { get; set; }

        [Required]
        public EvaluationType Type { get; set; }

        // Critères détaillés (optionnel)
        public DetailedEvaluationCriteria? DetailedScores { get; set; }
        public TutorEvaluationCriteria? TutorScores { get; set; }

        // Période d'évaluation
        public DateTime? EvaluationPeriodStart { get; set; }
        public DateTime? EvaluationPeriodEnd { get; set; }

        public string? StageReference { get; set; }
    }

    // DTO pour mettre à jour une évaluation
    public class UpdateRatingDto
    {
        [Range(1, 5, ErrorMessage = "La note doit être entre 1 et 5")]
        public double? Score { get; set; }

        [MaxLength(1000, ErrorMessage = "Le commentaire ne peut pas dépasser 1000 caractères")]
        public string? Comment { get; set; }

        public DetailedEvaluationCriteria? DetailedScores { get; set; }
        public TutorEvaluationCriteria? TutorScores { get; set; }

        public DateTime? EvaluationPeriodStart { get; set; }
        public DateTime? EvaluationPeriodEnd { get; set; }

        public string? StageReference { get; set; }
    }

    // DTO pour soumettre une évaluation
    public class SubmitRatingDto
    {
        [Required]
        public int RatingId { get; set; }
    }

    // DTO pour approuver/rejeter une évaluation
    public class ApproveRatingDto
    {
        [Required]
        public int RatingId { get; set; }

        [Required]
        public bool IsApproved { get; set; }

        public string? ApprovalComment { get; set; }
    }

    // DTO pour répondre à une évaluation
    public class RatingResponseDto
    {
        [Required]
        public int RatingId { get; set; }

        [Required]
        [MaxLength(500, ErrorMessage = "La réponse ne peut pas dépasser 500 caractères")]
        public string Response { get; set; }
    }

    // DTO de retour avec toutes les informations
    public class RatingDetailDto
    {
        public int Id { get; set; }

        // Informations sur l'évaluateur
        public int EvaluatorId { get; set; }
        public string EvaluatorName { get; set; }
        public string EvaluatorRole { get; set; }
        public string? EvaluatorProfilePicture { get; set; }

        // Informations sur la personne évaluée
        public int EvaluatedUserId { get; set; }
        public string EvaluatedUserName { get; set; }
        public string EvaluatedUserRole { get; set; }
        public string? EvaluatedUserProfilePicture { get; set; }

        public double Score { get; set; }
        public string Comment { get; set; }
        public EvaluationType Type { get; set; }
        public RatingStatus Status { get; set; }

        // Critères détaillés
        public DetailedEvaluationCriteria? DetailedScores { get; set; }
        public TutorEvaluationCriteria? TutorScores { get; set; }

        // Métadonnées
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }

        // Approbation
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByUserName { get; set; }

        // Réponse
        public string? Response { get; set; }
        public DateTime? ResponseDate { get; set; }

        // Période
        public DateTime? EvaluationPeriodStart { get; set; }
        public DateTime? EvaluationPeriodEnd { get; set; }
        public string? StageReference { get; set; }
    }

    // DTO pour lister les évaluations avec pagination
    public class RatingListDto
    {
        public int Id { get; set; }
        public string EvaluatorName { get; set; }
        public int EvaluatedUserId { get; set; }
        public string EvaluatedUserName { get; set; }
        public double Score { get; set; }
        public EvaluationType Type { get; set; }
        public RatingStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string? StageReference { get; set; }
    }

    // DTO pour les statistiques d'évaluation
    public class RatingStatsDto
    {
        public int TotalRatings { get; set; }
        public double AverageScore { get; set; }
        public double AverageScoreGiven { get; set; }
        public int PendingRatings { get; set; }
        public int ApprovedRatings { get; set; }
        public int DraftRatings { get; set; }

        // Distribution des notes
        public Dictionary<int, int> ScoreDistribution { get; set; } = new();

        // Statistiques par type
        public Dictionary<string, RatingTypeStats> StatsByType { get; set; } = new();
        public Dictionary<string, object> SpecialStats { get; set; }
    }

    public class RatingTypeStats
    {
        public int Count { get; set; }
        public double AverageScore { get; set; }
        public DateTime? LastRatingDate { get; set; }
    }

    // DTO pour les filtres de recherche - compatible avec votre structure existante
    public class RatingFilterDto
    {
        public int? EvaluatorId { get; set; }
        public int? EvaluatedUserId { get; set; }
        public EvaluationType? Type { get; set; }
        public RatingStatus? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public double? MinScore { get; set; }
        public double? MaxScore { get; set; }
        public string? StageReference { get; set; }

        // Pagination
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        // Tri
        public string? SortBy { get; set; } = "CreatedAt";
        public bool SortDescending { get; set; } = true;
    }

    // DTO pour les résultats paginés
    public class PagedRatingResultDto
    {
        public List<RatingListDto> Ratings { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public bool HasNextPage => PageNumber * PageSize < TotalCount;
        public bool HasPreviousPage => PageNumber > 1;
    }

    // Note: CreateNotificationDto existe déjà dans votre système
    // Nous utilisons votre CreateNotificationDto existant

    // Classes pour les critères d'évaluation détaillés
    public class DetailedEvaluationCriteria
    {
        [Range(1, 5)]
        public double TechnicalSkills { get; set; }      // Compétences techniques

        [Range(1, 5)]
        public double Communication { get; set; }        // Communication

        [Range(1, 5)]
        public double Teamwork { get; set; }            // Travail d'équipe

        [Range(1, 5)]
        public double Initiative { get; set; }          // Initiative

        [Range(1, 5)]
        public double Punctuality { get; set; }         // Ponctualité

        [Range(1, 5)]
        public double ProblemSolving { get; set; }      // Résolution de problèmes

        [Range(1, 5)]
        public double Adaptability { get; set; }        // Adaptabilité

        [Range(1, 5)]
        public double OverallPerformance { get; set; }  // Performance globale
    }

    // Classe pour les critères d'évaluation du tuteur par le stagiaire
    public class TutorEvaluationCriteria
    {
        [Range(1, 5)]
        public double Availability { get; set; }        // Disponibilité

        [Range(1, 5)]
        public double Guidance { get; set; }           // Accompagnement

        [Range(1, 5)]
        public double Communication { get; set; }       // Communication

        [Range(1, 5)]
        public double Expertise { get; set; }          // Expertise technique

        [Range(1, 5)]
        public double Support { get; set; }            // Soutien

        [Range(1, 5)]
        public double Feedback { get; set; }           // Qualité du feedback

        [Range(1, 5)]
        public double OverallSatisfaction { get; set; } // Satisfaction globale
    }
}