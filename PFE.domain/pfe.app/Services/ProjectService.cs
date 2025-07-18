using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.Application.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IProjectRepository _projectRepository;
        private readonly IUserRepository _userRepository;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public ProjectService(
            IProjectRepository projectRepository,
            IUserRepository userRepository,
            IWebHostEnvironment webHostEnvironment)
        {
            _projectRepository = projectRepository;
            _userRepository = userRepository;
            _webHostEnvironment = webHostEnvironment;
        }

        public async Task<IEnumerable<ProjectDto>> GetAllProjectsAsync()
        {
            var projects = await _projectRepository.GetAllAsync();
            return projects.Select(MapToProjectDto);
        }

        public async Task<ProjectDto> GetProjectByIdAsync(int id)
        {
            var project = await _projectRepository.GetByIdWithDetailsAsync(id);
            if (project == null)
                throw new Exception($"Projet avec ID {id} non trouvé");

            return MapToProjectDto(project);
        }

        public async Task<IEnumerable<ProjectDto>> GetProjectsForUserAsync(int userId)
        {
            var projects = await _projectRepository.GetProjectsForUserAsync(userId);
            return projects.Select(MapToProjectDto);
        }

        public async Task<ProjectDto> CreateProjectAsync(ProjectCreateDto projectDto)
        {
            var project = new Project
            {
                Title = projectDto.Title,
                Description = projectDto.Description,
                StartDate = projectDto.StartDate,
                EndDate = projectDto.EndDate,
                CreatedAt = DateTime.UtcNow
            };

            // Traitement de l'image si elle existe
            if (projectDto.Image != null && projectDto.Image.Length > 0)
            {
                var folderPath = Path.Combine(_webHostEnvironment.WebRootPath, "uploads", "projects");
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(projectDto.Image.FileName)}";
                var filePath = Path.Combine(folderPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await projectDto.Image.CopyToAsync(stream);
                }

                project.ImageUrl = $"/uploads/projects/{fileName}";
            }

            await _projectRepository.AddAsync(project);

            // Assigner les utilisateurs au projet si des ID ont été fournis
            if (projectDto.UserIds.Any())
            {
                await _projectRepository.AssignUsersToProjectAsync(project.Id, projectDto.UserIds);
            }

            // Récupérer le projet avec tous les détails
            project = await _projectRepository.GetByIdWithDetailsAsync(project.Id);
            return MapToProjectDto(project);
        }

        public async Task UpdateProjectAsync(int id, ProjectUpdateDto projectDto)
        {
            var project = await _projectRepository.GetByIdAsync(id);
            if (project == null)
                throw new Exception($"Projet avec ID {id} non trouvé");

            project.Title = projectDto.Title;
            project.Description = projectDto.Description;
            project.StartDate = projectDto.StartDate;
            project.EndDate = projectDto.EndDate;
            project.UpdatedAt = DateTime.UtcNow;

            // Traitement de l'image si elle existe
            if (projectDto.Image != null && projectDto.Image.Length > 0)
            {
                // Supprimer l'ancienne image si elle existe
                if (!string.IsNullOrEmpty(project.ImageUrl))
                {
                    var oldImagePath = Path.Combine(_webHostEnvironment.WebRootPath, project.ImageUrl.TrimStart('/'));
                    if (File.Exists(oldImagePath))
                    {
                        File.Delete(oldImagePath);
                    }
                }

                var folderPath = Path.Combine(_webHostEnvironment.WebRootPath, "uploads", "projects");
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(projectDto.Image.FileName)}";
                var filePath = Path.Combine(folderPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await projectDto.Image.CopyToAsync(stream);
                }

                project.ImageUrl = $"/uploads/projects/{fileName}";
            }

            await _projectRepository.UpdateAsync(project);
        }

        public async Task DeleteProjectAsync(int id)
        {
            var project = await _projectRepository.GetByIdAsync(id);
            if (project == null)
                throw new Exception($"Projet avec ID {id} non trouvé");

            // Supprimer l'image si elle existe
            if (!string.IsNullOrEmpty(project.ImageUrl))
            {
                var imagePath = Path.Combine(_webHostEnvironment.WebRootPath, project.ImageUrl.TrimStart('/'));
                if (File.Exists(imagePath))
                {
                    File.Delete(imagePath);
                }
            }

            await _projectRepository.DeleteAsync(project);
        }

        public async Task AssignUsersToProjectAsync(int projectId, List<int> userIds)
        {
            var project = await _projectRepository.GetByIdAsync(projectId);
            if (project == null)
                throw new Exception($"Projet avec ID {projectId} non trouvé");

            await _projectRepository.AssignUsersToProjectAsync(projectId, userIds);
        }

        public async Task RemoveUserFromProjectAsync(int projectId, int userId)
        {
            var project = await _projectRepository.GetByIdAsync(projectId);
            if (project == null)
                throw new Exception($"Projet avec ID {projectId} non trouvé");

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new Exception($"Utilisateur avec ID {userId} non trouvé");

            await _projectRepository.RemoveUserFromProjectAsync(projectId, userId);
        }

        private ProjectDto MapToProjectDto(Project project)
        {
            return new ProjectDto
            {
                Id = project.Id,
                Title = project.Title,
                Description = project.Description,
                ImageUrl = project.ImageUrl,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                CreatedAt = project.CreatedAt,
                Sprints = project.Sprints?.Select(s => new SprintDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Description = s.Description,
                    Status = s.Status.ToString(),
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    CreatedAt = s.CreatedAt
                }).ToList() ?? new List<SprintDto>(),
                Users = project.ProjectUsers?.Select(pu => new UserSimpleDto
                {
                    Id = pu.User.Id,
                    Username = pu.User.Username,
                    FirstName = pu.User.FirstName,
                    LastName = pu.User.LastName,
                    Email = pu.User.Email,
                    Role = pu.User.Role.ToString()
                }).ToList() ?? new List<UserSimpleDto>()
            };
        }

        public async Task<IEnumerable<Project>> GetUserProjectsAsync(int userId)
        {
            return await _projectRepository.GetProjectsByUserIdAsync(userId);
        }
    }
}
