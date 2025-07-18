using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFE.domain.Entities
{
    public enum SprintStatus
    {
        Todo,
        InProgress,
        Done
    }

    public class Sprint
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        public string Description { get; set; }

        public SprintStatus Status { get; set; } = SprintStatus.Todo;

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [Required]
        public int ProjectId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Relations
        [ForeignKey("ProjectId")]
        public virtual Project Project { get; set; }

        public virtual ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();

        public virtual ICollection<SprintHistory> SprintHistories { get; set; } = new List<SprintHistory>();
    }
}
