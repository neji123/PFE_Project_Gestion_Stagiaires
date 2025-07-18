using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.Application.DTOs;
using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User> GetByIdAsync(int id);
        Task<IEnumerable<User>> GetAllAsync();
        Task<User> GetByUsernameAsync(string username);
        Task<User> GetByEmailAsync(string email);
        Task<User> GetByUsernameOrEmailAsync(string usernameOrEmail);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(User user);
        Task<IEnumerable<User>> GetStagiairesByTuteurAsync(int tuteurId);
        Task<IEnumerable<User>> GetStagiairesSansTuteurAsync();
        Task AffecterStagiairesAsync(int tuteurId, IEnumerable<int> stagiaireIds);
        Task RetirerStagiaireAsync(int stagiaireId);
        Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role);

        Task<IEnumerable<User>> GetRecentUsersAsync(int count);
        Task<IEnumerable<User>> GetCompletedStagiairesAsync();


        /// <summary>
        /// Récupère tous les stagiaires qui ne sont affectés à aucun projet
        /// </summary>
        /// <returns>Liste des stagiaires non affectés</returns>
        Task<IEnumerable<User>> GetUnassignedStagiairesAsync();

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont pas affectés à un projet spécifique
        /// </summary>
        /// <param name="excludeProjectId">ID du projet à exclure</param>
        /// <returns>Liste des stagiaires non affectés à ce projet</returns>
        Task<IEnumerable<User>> GetStagiairesNotInProjectAsync(int excludeProjectId);
        Task<bool> CanDeleteUserAsync(int userId);
        Task<bool> SafeDeleteUserAsync(int userId);
        Task<UserDependenciesDto> GetUserDependenciesAsync(int userId);
    }
}
