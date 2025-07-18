using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PFE.domain.Entities
{
    // Table d'association pour la relation Many-to-Many entre Project et User
    public class ProjectUser
    {
        [Key, Column(Order = 0)]
        public int ProjectId { get; set; }

        [Key, Column(Order = 1)]
        public int UserId { get; set; }

        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;

        // Relations
        [ForeignKey("ProjectId")]
        public virtual Project Project { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; }
    }
}
