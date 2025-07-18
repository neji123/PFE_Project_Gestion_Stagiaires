using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using PFE.application.DTOs;
using PFE.Application.DTOs;
using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface IUserService
    {
        Task<AuthResponseDto> Register(UserRegistrationDto registrationDto);
        Task<AuthResponseDto> Login(UserLoginDto loginDto);
        Task<User> GetUserByIdAsync(int id);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task UpdateUserAsync(User user);
        Task DeleteUserAsync(int id);
        Task<IEnumerable<User>> GetStagiairesByTuteurAsync(int tuteurId);
        Task<IEnumerable<User>> GetStagiairesSansTuteurAsync();
        Task AffecterStagiairesAsync(int tuteurId, IEnumerable<int> stagiaireIds);
        Task RetirerStagiaireAsync(int stagiaireId);
        Task<IEnumerable<User>> GetUsersByRoleAsync(string role);
        Task<IEnumerable<User>> GetProjectUsersAsync(int projectId);
        Task<bool> UpdateProjectUsersAsync(int projectId, List<string> usersToAdd, List<string> usersToRemove);
        Task<User> UpdateUserPartialAsync(int userId, UserUpdateDto updateDto);
        Task<bool> VerifyPasswordAsync(int userId, string password);

        //auth google
        Task<AuthResponseDto> ExternalLoginAsync(ExternalAuthDto externalAuth);
        Task<AuthResponseDto> ExternalLoginSimpleAsync(ExternalAuthDto externalAuth);

        Task SendPasswordResetEmailAsync(string email);
        Task<bool> ResetPasswordAsync(string token, string email, string newPassword);
        //Task<IEnumerable<User>> GetCompletedStagiairesAsync();
        Task<IEnumerable<object>> GetCompletedStagiairesForAttestationAsync();


        // Nouvelles méthodes pour Skills et CV
        /// <summary>
        /// Met à jour les compétences d'un utilisateur
        /// </summary>
        Task<User> UpdateUserSkillsAsync(int userId, string skills);

        /// <summary>
        /// Upload du CV pour un utilisateur
        /// </summary>
        Task<User> UploadUserCvAsync(int userId, IFormFile cvFile);

        /// <summary>
        /// Supprime le CV d'un utilisateur
        /// </summary>
        Task<User> DeleteUserCvAsync(int userId);

        /// <summary>
        /// Récupère les informations du CV et compétences d'un utilisateur
        /// </summary>
        Task<object> GetUserCvInfoAsync(int userId);

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont affectés à aucun projet
        /// </summary>
        /// <returns>Liste des stagiaires non affectés</returns>
        Task<IEnumerable<UserSimpleDto>> GetUnassignedStagiairesAsync();

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont pas affectés à un projet spécifique
        /// </summary>
        /// <param name="excludeProjectId">ID du projet à exclure</param>
        /// <returns>Liste des stagiaires non affectés à ce projet</returns>
        Task<IEnumerable<UserSimpleDto>> GetStagiairesNotInProjectAsync(int excludeProjectId);
      
        Task<UserDependenciesDto> GetUserDependenciesAsync(int userId);
        Task<bool> SafeDeleteUserAsync(int userId);
    }

}
