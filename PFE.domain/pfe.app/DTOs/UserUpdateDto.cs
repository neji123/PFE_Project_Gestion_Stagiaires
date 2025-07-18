using Microsoft.AspNetCore.Http;
using System;
using System.ComponentModel.DataAnnotations;

namespace PFE.Application.DTOs
{
    public class UserUpdateDto
    {
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; } // Pour la mise à jour du mot de passe
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Role { get; set; } // Sera converti en UserRole enum

        // Photo de profil
        public IFormFile? ProfilePicture { get; set; }
        public string? ProfilePictureUrl { get; set; }

        // Relations
        public int? TuteurId { get; set; }
        public int? DepartmentId { get; set; }
        public int? UniversityId { get; set; }

        // Propriétés pour les tuteurs
        public int? YearsExperience { get; set; }

        // Propriétés pour les stagiaires
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double? Note { get; set; }
        public string? Stage { get; set; } // Sera converti en stage enum
        public string? Etudiant { get; set; } // Sera converti en etudiant enum

        // Statut
        public bool? Statuts { get; set; }
        public string? Skills { get; set; } // Corrigé: ajout du ?
        public IFormFile? CvFile { get; set; } // Corrigé: ajout du ?
    }

    // Nouveau DTO spécifique pour les compétences
    public class UpdateSkillsDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public string Skills { get; set; }
    }

    // Nouveau DTO pour l'upload de CV
    public class UploadCvDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public IFormFile CvFile { get; set; }
    }

    // DTO pour retourner les informations du CV
    public class UserCvInfoDto
    {
        public bool HasCv { get; set; }
        public string? CvUrl { get; set; }
        public string? OriginalFileName { get; set; }
        public DateTime? UploadedAt { get; set; }
        public string? Skills { get; set; }
    }

    // DTO étendu pour les informations utilisateur incluant Skills et CV
    public class UserDetailsDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public string Role { get; set; }
        public string? ProfilePictureUrl { get; set; }

        // Propriétés métier
        public int? TuteurId { get; set; }
        public string? TuteurName { get; set; }
        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? UniversityId { get; set; }
        public string? UniversityName { get; set; }
        public int? YearsExperience { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double? Note { get; set; }
        public string? Stage { get; set; }
        public string? Etudiant { get; set; }
        public bool? Statuts { get; set; }

        // Nouvelles propriétés
        public string? Skills { get; set; }
        public string? CvUrl { get; set; }
        public string? CvOriginalFileName { get; set; }
        public DateTime? CvUploadedAt { get; set; }
        public bool HasCv => !string.IsNullOrEmpty(CvUrl);
    }

    public class CompleteProfileUpdateDto
    {
        public string? Skills { get; set; }
        public IFormFile? CvFile { get; set; }
    }

    // DTO pour recevoir juste les skills en JSON (optionnel)
    public class SkillsOnlyDto
    {
        [Required]
        public string Skills { get; set; }
    }
}