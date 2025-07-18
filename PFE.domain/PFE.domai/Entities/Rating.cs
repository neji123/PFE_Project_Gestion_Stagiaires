using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFE.domain.Entities
{
    public enum EvaluationType
    {
        TuteurToStagiaire,    // Tuteur évalue un stagiaire
        RHToStagiaire,        // RH évalue un stagiaire
        StagiaireToTuteur     // Stagiaire évalue son tuteur
    }

    public enum RatingStatus
    {
        Draft,      // Brouillon
        Submitted,  // Soumis
        Approved,   // Approuvé (par RH ou Admin)
        Rejected    // Rejeté
    }

    public class Rating
    {
        public int Id { get; set; }

        [Required]
        public int EvaluatorId { get; set; } // Qui évalue

        [ForeignKey("EvaluatorId")]
        public User Evaluator { get; set; }

        [Required]
        public int EvaluatedUserId { get; set; } // Qui est évalué

        [ForeignKey("EvaluatedUserId")]
        public User EvaluatedUser { get; set; }

        [Required]
        [Range(1, 5)]
        public double Score { get; set; } // Note sur 5

        [Required]
        [MaxLength(1000)]
        public string Comment { get; set; }

        [Required]
        public EvaluationType Type { get; set; }

        public RatingStatus Status { get; set; } = RatingStatus.Draft;

        // Critères d'évaluation détaillés (JSON)
        public string? DetailedScores { get; set; } // Stockage JSON des critères

        // Métadonnées
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }

        // Qui a approuvé/rejeté (si applicable)
        public int? ApprovedByUserId { get; set; }
        [ForeignKey("ApprovedByUserId")]
        public User? ApprovedByUser { get; set; }

        // Réponse/feedback optionnel de la personne évaluée
        public string? Response { get; set; }
        public DateTime? ResponseDate { get; set; }

        // Période d'évaluation
        public DateTime? EvaluationPeriodStart { get; set; }
        public DateTime? EvaluationPeriodEnd { get; set; }

        // Pour les évaluations de stage - référence au stage
        public string? StageReference { get; set; }
    }

    // Classe pour les critères d'évaluation détaillés
    public class DetailedEvaluationCriteria
    {
        public double TechnicalSkills { get; set; }      // Compétences techniques
        public double Communication { get; set; }        // Communication
        public double Teamwork { get; set; }            // Travail d'équipe
        public double Initiative { get; set; }          // Initiative
        public double Punctuality { get; set; }         // Ponctualité
        public double ProblemSolving { get; set; }      // Résolution de problèmes
        public double Adaptability { get; set; }        // Adaptabilité
        public double OverallPerformance { get; set; }  // Performance globale
    }

    // Classe pour les critères d'évaluation du tuteur par le stagiaire
    public class TutorEvaluationCriteria
    {
        public double Availability { get; set; }        // Disponibilité
        public double Guidance { get; set; }           // Accompagnement
        public double Communication { get; set; }       // Communication
        public double Expertise { get; set; }          // Expertise technique
        public double Support { get; set; }            // Soutien
        public double Feedback { get; set; }           // Qualité du feedback
        public double OverallSatisfaction { get; set; } // Satisfaction globale
    }
}