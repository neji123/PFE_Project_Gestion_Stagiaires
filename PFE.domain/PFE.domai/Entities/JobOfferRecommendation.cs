using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFE.domain.Entities
{
    public class JobOfferRecommendation
    {
        [Key]
        public int Id { get; set; }

        // Clés étrangères
        [Required]
        public int JobOfferId { get; set; }

        [Required]
        public int StagiaireId { get; set; }

        // Informations du candidat (dénormalisées)
        [Required]
        [MaxLength(255)]
        public string StagiaireEmail { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string StagiaireeName { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string Skills { get; set; } = string.Empty;

        [MaxLength(255)]
        public string Department { get; set; } = string.Empty;

        [MaxLength(255)]
        public string University { get; set; } = string.Empty;

        // Scores de recommandation IA
        [Column(TypeName = "decimal(5,4)")]
        public double CompositeScore { get; set; }

        [Column(TypeName = "decimal(5,4)")]
        public double SkillSimilarity { get; set; }

        [Column(TypeName = "decimal(5,4)")]
        public double TextSimilarity { get; set; }

        public bool DepartmentMatch { get; set; }

        // Métadonnées
        public int RecommendationRank { get; set; }

        [MaxLength(1000)]
        public string MatchReasons { get; set; } = string.Empty;

        public DateTime GeneratedAt { get; set; }

        // Statuts de suivi
        public bool IsViewed { get; set; } = false;
        public bool IsContacted { get; set; } = false;
        public bool IsSelected { get; set; } = false;
        public bool IsActive { get; set; } = true;

        [MaxLength(1000)]
        public string? Notes { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Relations navigation
        [ForeignKey(nameof(JobOfferId))]
        public virtual JobOffer JobOffer { get; set; } = null!;

        [ForeignKey(nameof(StagiaireId))]
        public virtual User Stagiaire { get; set; } = null!;
    }
}