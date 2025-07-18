using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace PFE.domain.Entities
{
    public class SprintHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SprintId { get; set; }

        [Required]
        public SprintStatus OldStatus { get; set; }

        [Required]
        public SprintStatus NewStatus { get; set; }

        public string Comments { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relations
        [ForeignKey("SprintId")]
        public virtual Sprint Sprint { get; set; }
    }
}

