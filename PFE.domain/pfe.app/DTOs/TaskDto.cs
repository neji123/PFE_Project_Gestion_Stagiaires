using System;
using System.ComponentModel.DataAnnotations;

namespace PFE.Application.DTOs
{
    // DTOs pour les Tâches
    public class TaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public UserSimpleDto AssignedTo { get; set; }
    }

    public class TaskCreateDto
    {
        [Required(ErrorMessage = "Le titre est obligatoire")]
        public string Title { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "L'identifiant du sprint est obligatoire")]
        public int SprintId { get; set; }

        public int? AssignedToId { get; set; }
    }

    public class TaskUpdateDto
    {
        [Required(ErrorMessage = "Le titre est obligatoire")]
        public string Title { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "Le statut est obligatoire")]
        public string Status { get; set; }

        public int? AssignedToId { get; set; }
    }

    // DTO simplifié pour l'utilisateur (réutilisé dans plusieurs DTOs)
    public class UserSimpleDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? PhoneNumber { get; set; }

        // Propriétés optionnelles supplémentaires pour plus d'informations
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? University { get; set; }
        public string? Department { get; set; }
        public bool? Statuts { get; set; }

        // Propriétés utiles pour l'affectation de projets
        public bool IsAssignedToProject { get; set; }
        public int ProjectCount { get; set; }
    }
}
