using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PFE.Application.DTOs
{
    // DTOs pour les Sprints
    public class SprintDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<TaskDto> Tasks { get; set; } = new List<TaskDto>();
    }

    public class SprintCreateDto
    {
        [Required(ErrorMessage = "Le nom est obligatoire")]
        public string Name { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "La date de début est obligatoire")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "La date de fin est obligatoire")]
        public DateTime EndDate { get; set; }

        [Required(ErrorMessage = "L'identifiant du projet est obligatoire")]
        public int ProjectId { get; set; }
    }

    public class SprintUpdateDto
    {
        [Required(ErrorMessage = "Le nom est obligatoire")]
        public string Name { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "Le statut est obligatoire")]
        public string Status { get; set; }

        [Required(ErrorMessage = "La date de début est obligatoire")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "La date de fin est obligatoire")]
        public DateTime EndDate { get; set; }
    }

    public class SprintStatusUpdateDto
    {
        [Required(ErrorMessage = "Le statut est obligatoire")]
        public string Status { get; set; }

        public string Comments { get; set; }
    }
}
