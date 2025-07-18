using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PFE.Application.DTOs
{
    // DTOs pour les Projets
    public class ProjectDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SprintDto> Sprints { get; set; } = new List<SprintDto>();
        public List<UserSimpleDto> Users { get; set; } = new List<UserSimpleDto>();
    }

    public class ProjectCreateDto
    {
        [Required(ErrorMessage = "Le titre est obligatoire")]
        public string Title { get; set; }

        [Required(ErrorMessage = "La description est obligatoire")]
        public string Description { get; set; }

        // Image facultative
        public IFormFile Image { get; set; }

        //[Required(ErrorMessage = "La date de début est obligatoire")]
        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public List<int> UserIds { get; set; } = new List<int>();
    }

    public class ProjectUpdateDto
    {
        [Required(ErrorMessage = "Le titre est obligatoire")]
        public string Title { get; set; }

        [Required(ErrorMessage = "La description est obligatoire")]
        public string Description { get; set; }

        // Image facultative
        public IFormFile? Image { get; set; }

      //  [Required(ErrorMessage = "La date de début est obligatoire")]
        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }
    }
}
