using PFE.Application.DTOs;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
    public class AvailabilityCheckDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public string Date { get; set; }

        [Required]
        public string Time { get; set; }

        [Required]
        [Range(15, 480)] // 15 minutes à 8 heures
        public int Duration { get; set; }

        public int? ExcludeMeetingId { get; set; }
    }

    // Vous pouvez aussi ajouter d'autres DTOs utiles :
    public class ConflictCheckResultDto
    {
        public bool HasConflict { get; set; }
        public List<string> ConflictMessages { get; set; } = new List<string>();
        public List<MeetingDto> ConflictingMeetings { get; set; } = new List<MeetingDto>();
    }

    public class BulkAvailabilityCheckDto
    {
        [Required]
        public List<int> UserIds { get; set; } = new List<int>();

        [Required]
        public string Date { get; set; }

        [Required]
        public string Time { get; set; }

        [Required]
        public int Duration { get; set; }

        public int? ExcludeMeetingId { get; set; }
    }
}
