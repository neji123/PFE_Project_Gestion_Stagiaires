using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace PFE.domain.Entities
{
    public enum TaskStatus
    {
        Todo,
        InProgress,
        Done
    }

    public class ProjectTask  // Renommé de Task à ProjectTask
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; }

        public string Description { get; set; }

        public TaskStatus Status { get; set; } = TaskStatus.Todo;

        [Required]
        public int SprintId { get; set; }

        public int? AssignedToId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Relations
        [ForeignKey("SprintId")]
        public virtual Sprint Sprint { get; set; }

        [ForeignKey("AssignedToId")]
        public virtual User AssignedTo { get; set; }
    }
}