using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFE.domain.Entities
{
    public class JobOffer
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } // Titre du poste

        [Required]
        [MaxLength(5000)]
        public string Description { get; set; } // Description du poste

        [Required]
        [MaxLength(2000)]
        public string RequiredSkills { get; set; } // Compétences requises

        [Required]
        public int DepartmentId { get; set; } // ID du département (obligatoire)

        [ForeignKey("DepartmentId")]
        public Department Department { get; set; } // Navigation vers le département

        [Required]
        public int PublishedByUserId { get; set; } // ID de l'utilisateur RH qui publie

        [ForeignKey("PublishedByUserId")]
        public User PublishedBy { get; set; } // Navigation vers l'utilisateur RH

        public DateTime PublishedAt { get; set; } = DateTime.UtcNow; // Date de publication

        /// <summary>
        /// Si les recommandations IA ont été générées pour cette offre
        /// </summary>
        public bool RecommendationsGenerated { get; set; } = false;

        /// <summary>
        /// Date de la dernière génération de recommandations
        /// </summary>
        public DateTime? LastRecommendationGeneratedAt { get; set; }

        /// <summary>
        /// Nombre de recommandations générées
        /// </summary>
        public int RecommendationCount { get; set; } = 0;

        /// <summary>
        /// Statut de l'offre
        /// </summary>
        public JobOfferStatus Status { get; set; } = JobOfferStatus.Active;

        // Navigation vers les recommandations
        public virtual ICollection<JobOfferRecommendation> Recommendations { get; set; } = new List<JobOfferRecommendation>();
    }

    public enum JobOfferStatus
    {
        Active = 0,    
        Draft = 1,
        Paused = 2,
        Filled = 3,
        Closed = 4
    }
}
