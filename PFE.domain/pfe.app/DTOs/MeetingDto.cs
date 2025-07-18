using PFE.domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace PFE.Application.DTOs
{
    public class MeetingDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Type { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public int Duration { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string Status { get; set; }
        public bool IsRecurring { get; set; }
        public int OrganizerId { get; set; }
        public List<int> ParticipantIds { get; set; } = new List<int>();
        public List<UserDto>? Participants { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateMeetingDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Type { get; set; }

        [Required]
        public string Date { get; set; }

        [Required]
        public string Time { get; set; }

        [Required]
        [Range(15, 480)] // 15 minutes à 8 heures
        public int Duration { get; set; }

        public string? Description { get; set; }

        public string? Location { get; set; }

        public string Status { get; set; } = "planifie";

        public bool IsRecurring { get; set; } = false;

        [Required]
        public int OrganizerId { get; set; }

        [Required]
        public List<int> ParticipantIds { get; set; } = new List<int>();
    }

    public class UpdateMeetingDto
    {
        public string? Title { get; set; }
        public string? Type { get; set; }
        public string? Date { get; set; }
        public string? Time { get; set; }
        public int? Duration { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public string? Status { get; set; }
        public bool? IsRecurring { get; set; }
        public List<int>? ParticipantIds { get; set; }
    }

    public class MeetingFilterDto
    {
        public string? Type { get; set; }
        public string? Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? UserId { get; set; }
        public int? OrganizerId { get; set; }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public int? TuteurId { get; set; }
        public string ProfilePictureUrl { get; set; }
    }
}