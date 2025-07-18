using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PFE.domain.Entities
{
    public enum MeetingType
    {
        TuteurStagiaire,
        RhStagiaire,
        Evaluation,
        Suivi
    }

    public enum MeetingStatus
    {
        Planifie,
        Confirme,
        Annule,
        Termine
    }

    public class Meeting
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public MeetingType Type { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public TimeSpan Time { get; set; }

        [Required]
        public int Duration { get; set; } // En minutes

        public string? Description { get; set; }

        public string? Location { get; set; }

        public MeetingStatus Status { get; set; } = MeetingStatus.Planifie;

        public bool IsRecurring { get; set; } = false;

        [Required]
        public int OrganizerId { get; set; }

        [ForeignKey("OrganizerId")]
        public User Organizer { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property pour les participants
        [JsonIgnore]
        public ICollection<MeetingParticipant> MeetingParticipants { get; set; } = new List<MeetingParticipant>();

        // Propriété calculée pour obtenir les IDs des participants
        [NotMapped]
        public List<int> ParticipantIds
        {
            get => MeetingParticipants?.Select(mp => mp.UserId).ToList() ?? new List<int>();
            set
            {
                // Cette propriété sera gérée via le service
            }
        }

        // Propriété calculée pour obtenir les participants complets
        [NotMapped]
        public List<User> Participants
        {
            get => MeetingParticipants?.Select(mp => mp.User).ToList() ?? new List<User>();
        }
    }

    // Table de liaison pour la relation many-to-many entre Meeting et User
    public class MeetingParticipant
    {
        public int MeetingId { get; set; }
        public Meeting Meeting { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        public bool HasAccepted { get; set; } = false;
    }
}