using System.ComponentModel.DataAnnotations;

namespace PFE.Application.DTOs
{
    // DTO pour créer une nouvelle offre
    public class CreateJobOfferDto
    {
        [Required(ErrorMessage = "Le titre est obligatoire")]
        [StringLength(200, ErrorMessage = "Le titre ne peut pas dépasser 200 caractères")]
        public string Title { get; set; }

        [Required(ErrorMessage = "La description est obligatoire")]
        [StringLength(5000, ErrorMessage = "La description ne peut pas dépasser 5000 caractères")]
        public string Description { get; set; }

        [Required(ErrorMessage = "Les compétences requises sont obligatoires")]
        [StringLength(2000, ErrorMessage = "Les compétences ne peuvent pas dépasser 2000 caractères")]
        public string RequiredSkills { get; set; }

        [Required(ErrorMessage = "Le département est obligatoire")]
        public int DepartmentId { get; set; }
    }

    // DTO pour mettre à jour une offre
    public class UpdateJobOfferDto
    {
        [Required(ErrorMessage = "Le titre est obligatoire")]
        [StringLength(200, ErrorMessage = "Le titre ne peut pas dépasser 200 caractères")]
        public string Title { get; set; }

        [Required(ErrorMessage = "La description est obligatoire")]
        [StringLength(5000, ErrorMessage = "La description ne peut pas dépasser 5000 caractères")]
        public string Description { get; set; }

        [Required(ErrorMessage = "Les compétences requises sont obligatoires")]
        [StringLength(2000, ErrorMessage = "Les compétences ne peuvent pas dépasser 2000 caractères")]
        public string RequiredSkills { get; set; }

        [Required(ErrorMessage = "Le département est obligatoire")]
        public int DepartmentId { get; set; }
    }

    // DTO pour retourner les informations d'une offre
    public class JobOfferDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string RequiredSkills { get; set; }
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int PublishedByUserId { get; set; }
        public string PublishedByName { get; set; }
        public DateTime PublishedAt { get; set; }
    }

    // DTO simple pour les listes
    public class JobOfferSimpleDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string DepartmentName { get; set; }
        public string PublishedByName { get; set; }
        public DateTime PublishedAt { get; set; }
    }
}