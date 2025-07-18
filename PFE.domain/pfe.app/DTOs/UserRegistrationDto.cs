using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using PFE.domain.Entities;

namespace PFE.Application.DTOs
{
    public class UserRegistrationDto
    {
        [Required(ErrorMessage = "Le nom d'utilisateur est obligatoire.")]
        [MinLength(4, ErrorMessage = "Le nom d'utilisateur doit contenir au moins 4 caractères.")]
        public string Username { get; set; }

        [Required(ErrorMessage = "L'email est obligatoire.")]
        [EmailAddress(ErrorMessage = "Le format de l'email est invalide.")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Le mot de passe est obligatoire.")]
        [MinLength(8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères.")]
        public string Password { get; set; }

        [Required(ErrorMessage = "La confirmation du mot de passe est obligatoire.")]
        [Compare("Password", ErrorMessage = "Les mots de passe ne correspondent pas.")]
        public string ConfirmPassword { get; set; }

        [Required(ErrorMessage = "Le prénom est obligatoire.")]
        [RegularExpression(@"^[A-Za-z]+$", ErrorMessage = "Le prénom doit contenir uniquement des lettres.")]
        public string FirstName { get; set; }

        [Required(ErrorMessage = "Le nom de famille est obligatoire.")]
        [RegularExpression(@"^[A-Za-z]+$", ErrorMessage = "Le nom de famille doit contenir uniquement des lettres.")]
        public string LastName { get; set; }

        [Required(ErrorMessage = "Le numéro de téléphone est obligatoire.")]
        [RegularExpression(@"^\+216\d{8}$", ErrorMessage = "Le numéro de téléphone doit être au format +216XXXXXXXX.")]
        public string PhoneNumber { get; set; }

        [Required(ErrorMessage = "Le rôle est obligatoire.")]
        public string Role { get; set; }
        public IFormFile ProfilePicture { get; set; }

        // Propriétés pour la relation tuteur-stagiaire
        public int? TuteurId { get; set; }
        public string? TuteurName { get; set; } // Facultatif, peut être utile pour l'affichage

        // Propriétés spécifiques aux tuteurs
       // public string Speciality { get; set; }
        public int? YearsExperience { get; set; }
      //  public string Department { get; set; }
        public int DepartmentId { get; set; }

        // Propriétés spécifiques aux stagiaires

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double? Note { get; set; }
  
        public string? Stage { get; set; } // Will receive "stage_été" or "stage_pfe"
        public string? Etudiant { get; set; }

        // University property
        public int? UniversityId { get; set; }
      public bool? statuts { get; set; }

        public string? Skills { get; set; }
        public IFormFile? CvFile { get; set; }

    }
}
