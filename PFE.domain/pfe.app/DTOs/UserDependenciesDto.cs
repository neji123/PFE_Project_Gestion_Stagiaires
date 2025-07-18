using System;
using System.Collections.Generic;

namespace PFE.Application.DTOs
{
    /// <summary>
    /// DTO pour représenter les dépendances d'un utilisateur avant suppression
    /// </summary>
    public class UserDependenciesDto
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Role { get; set; }

        /// <summary>
        /// Nombre de stagiaires assignés (si c'est un tuteur)
        /// </summary>
        public int StagiairesCount { get; set; }

        /// <summary>
        /// Nombre de projets où l'utilisateur est assigné
        /// </summary>
        public int ProjectsCount { get; set; }

        /// <summary>
        /// Nombre de notifications liées à l'utilisateur
        /// </summary>
        public int NotificationsCount { get; set; }

        /// <summary>
        /// Nombre de rapports créés par l'utilisateur
        /// </summary>
        public int ReportsCount { get; set; }

        /// <summary>
        /// Indique si l'utilisateur peut être supprimé sans contraintes
        /// </summary>
        public bool CanDelete { get; set; }

        /// <summary>
        /// Raisons qui empêchent la suppression
        /// </summary>
        public List<string> BlockingReasons { get; set; } = new List<string>();

        /// <summary>
        /// Détails des stagiaires assignés (si c'est un tuteur)
        /// </summary>
        public List<StagiaireInfo> AssignedStagiaires { get; set; } = new List<StagiaireInfo>();

        /// <summary>
        /// Détails des projets assignés
        /// </summary>
        public List<ProjectInfo> AssignedProjects { get; set; } = new List<ProjectInfo>();
    }

    /// <summary>
    /// Informations sur un stagiaire assigné
    /// </summary>
    public class StagiaireInfo
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string FullName => $"{FirstName} {LastName}";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    /// <summary>
    /// Informations sur un projet assigné
    /// </summary>
    public class ProjectInfo
    {
        public int Id { get; set; }
        public string ProjectName { get; set; }
        public string Description { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; }
    }
}