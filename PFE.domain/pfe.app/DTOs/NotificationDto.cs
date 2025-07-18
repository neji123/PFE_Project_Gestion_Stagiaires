using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using PFE.domain.Entities;

namespace PFE.application.DTOs
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public string Type { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }
        public string? RelatedEntityId { get; set; }
    }

    public class CreateNotificationDto
    {
        [Required]
        public string Title { get; set; }

        [Required]
        public string Message { get; set; }

        public NotificationType Type { get; set; } = NotificationType.Other;

        [Required]
        public int UserId { get; set; }

        public string? RelatedEntityId { get; set; }
    }
}
