using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization;


namespace PFE.domain.Entities
{
    public enum NotificationStatus
    {
        Unread,
        Read
    }

    public enum NotificationType
    {
        Other = 0,
        Info = 1,
        Success = 2,
        Warning = 3,
        Error = 4,
        Welcome = 5,
        UserRegistration = 6,
        // Add more types as needed

        // Types pour les ratings/évaluations
        RatingReceived = 7,        // Évaluation reçue
        RatingSubmitted = 8,       // Évaluation soumise
        RatingApproved = 9,        // Évaluation approuvée
        RatingRejected = 10,       // Évaluation rejetée
        RatingResponse = 11,       // Réponse à l'évaluation
        RatingReminder = 12,       // Rappel d'évaluation
        RatingRequest = 13         // Demande d'évaluation
    }

    public class Notification
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; }

        [Required]
        public string Message { get; set; }

        public NotificationType Type { get; set; } = NotificationType.Other;

        public NotificationStatus Status { get; set; } = NotificationStatus.Unread;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("User")]
        public int UserId { get; set; }

        [JsonIgnore]
        public virtual User User { get; set; }

        public string? RelatedEntityId { get; set; } // Can store ID of related reservation/transaction etc.
    }
}
