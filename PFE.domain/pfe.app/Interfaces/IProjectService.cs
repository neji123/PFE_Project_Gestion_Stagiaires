using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.Application.DTOs;
using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface IProjectService
    {
        Task<IEnumerable<ProjectDto>> GetAllProjectsAsync();
        Task<ProjectDto> GetProjectByIdAsync(int id);
        Task<IEnumerable<ProjectDto>> GetProjectsForUserAsync(int userId);
        Task<ProjectDto> CreateProjectAsync(ProjectCreateDto projectDto);
        Task UpdateProjectAsync(int id, ProjectUpdateDto projectDto);
        Task DeleteProjectAsync(int id);
        Task AssignUsersToProjectAsync(int projectId, List<int> userIds);
        Task RemoveUserFromProjectAsync(int projectId, int userId);
        Task<IEnumerable<Project>> GetUserProjectsAsync(int userId);

    }
}
