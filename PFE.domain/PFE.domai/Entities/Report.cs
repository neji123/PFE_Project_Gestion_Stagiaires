// PFE.domain.Entities/Report.cs - Version mise à jour
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFE.domain.Entities
{
    public class Report
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [StringLength(1000)]
        public string Description { get; set; }

        [Required]
        public string FilePath { get; set; }

        public DateTime SubmissionDate { get; set; }
        public DateTime? DueDate { get; set; }
        public bool IsSubmitted { get; set; }
        public bool IsApproved { get; set; }
        public bool IsRejected { get; set; }

        [StringLength(2000)]
        public string? FeedbackComments { get; set; }

        public int? PreviousReportId { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Actif";

        // Relation avec le nouveau ReportType dynamique
        public int ReportTypeId { get; set; }
        [ForeignKey("ReportTypeId")]
        public virtual ReportType ReportType { get; set; }

        // Relation avec le stagiaire
        public int StagiaireId { get; set; }
        [ForeignKey("StagiaireId")]
        public virtual User Stagiaire { get; set; }

        // Relation avec le tuteur qui doit approuver le rapport
        public int? ApproverId { get; set; }
        [ForeignKey("ApproverId")]
        public virtual User Approver { get; set; }

        // Clé étrangère vers StageTimeline (optionnelle)
        public int? StageTimelineId { get; set; }

        /// <summary>
        /// Date de création
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Date de dernière modification
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
    }
}