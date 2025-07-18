using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
namespace PFE.domain.Entities
{
    public enum stage
    {
        stage_été,
        stage_pfe,
    }
    public enum etudiant
    {
        ingénierie,
        licence,
        master
    }
    public class University
    {
        public int Id { get; set; } // Clé primaire
        public string Universityname { get; set; }
    }
    public enum UserRole
    {
        Admin,
        RHs,
        Tuteur,
        Stagiaire,
        Ressource
    }
    public class Department
    {
        public int Id { get; set; }
        public string DepartmentName { get; set; }
    }
    public class User
    {
        public int Id { get; set; } // Clé primaire
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; } // Stocke le mot de passe haché
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string PhoneNumber { get; set; }
        public UserRole Role { get; set; }
        public string ProfilePictureUrl { get; set; }
        public int? TuteurId { get; set; }
        // Navigation property (facultatif, pour faciliter l'accès via Entity Framework)
        [ForeignKey("TuteurId")]
        public User Tuteur { get; set; }
        // Navigation property pour les tuteurs (liste des stagiaires dont ils sont responsables)
        [InverseProperty("Tuteur")]
        public ICollection<User> Stagiaires { get; set; } = new List<User>();
        // Propriétés spécifiques aux tuteurs
        //  public string Speciality { get; set; }  ligne supprimé
        public int? YearsExperience { get; set; } // ajoute ? 
        public Department? Department { get; set; }
        public int? DepartmentId { get; set; }
        // Propriétés spécifiques aux stagiaires
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public double? Note { get; set; }
        public University? University { get; set; }
        public int? UniversityId { get; set; }
        public stage? stage { get; set; }
        public etudiant? etudiant { get; set; }
        public bool? statuts { get; set; }

        // Nouvelles propriétés pour Skills et CV
        /// <summary>
        /// Compétences de l'utilisateur (JSON ou texte séparé par des virgules)
        /// </summary>
        public string? Skills { get; set; }

        /// <summary>
        /// Chemin vers le fichier CV uploadé
        /// </summary>
        public string? CvUrl { get; set; }

        /// <summary>
        /// Date d'upload du CV
        /// </summary>
        public DateTime? CvUploadedAt { get; set; }

        /// <summary>
        /// Nom original du fichier CV
        /// </summary>
        public string? CvOriginalFileName { get; set; }

        /// <summary>
        /// Token utilisé pour la réinitialisation du mot de passe
        /// </summary>
        public string? PasswordResetToken { get; set; }
        /// <summary>
        /// Date d'expiration du token de réinitialisation
        /// </summary>
        public DateTime? PasswordResetTokenExpires { get; set; }
        [JsonIgnore]
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        [JsonIgnore]
        public virtual ICollection<ProjectUser> ProjectUsers { get; set; } = new List<ProjectUser>();
    }
}