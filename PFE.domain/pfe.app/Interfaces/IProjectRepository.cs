using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface IProjectRepository
    {
        Task<IEnumerable<Project>> GetAllAsync();
        Task<Project> GetByIdAsync(int id);
        Task<Project> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<Project>> GetProjectsForUserAsync(int userId);
        Task AddAsync(Project project);
        Task UpdateAsync(Project project);
        Task DeleteAsync(Project project);
        Task AssignUsersToProjectAsync(int projectId, IEnumerable<int> userIds);
        Task RemoveUserFromProjectAsync(int projectId, int userId);
       // Task<Project> GetByIdAsync(int id);
        Task<IEnumerable<User>> GetProjectUsersAsync(int projectId);
        Task<bool> UpdateProjectUsersAsync(int projectId, List<string> usersToAdd, List<string> usersToRemove);
        Task<IEnumerable<Project>> GetProjectsByUserIdAsync(int userId);

    }
}
