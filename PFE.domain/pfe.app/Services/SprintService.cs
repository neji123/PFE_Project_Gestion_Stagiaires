using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.Application.Services
{
    public class SprintService : ISprintService
    {
        private readonly ISprintRepository _sprintRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly ISprintHistoryRepository _sprintHistoryRepository;

        public SprintService(
            ISprintRepository sprintRepository,
            IProjectRepository projectRepository,
            ISprintHistoryRepository sprintHistoryRepository)
        {
            _sprintRepository = sprintRepository;
            _projectRepository = projectRepository;
            _sprintHistoryRepository = sprintHistoryRepository;
        }

        public async Task<IEnumerable<SprintDto>> GetAllSprintsAsync()
        {
            var sprints = await _sprintRepository.GetAllAsync();
            return sprints.Select(MapToSprintDto);
        }

        public async Task<SprintDto> GetSprintByIdAsync(int id)
        {
            var sprint = await _sprintRepository.GetByIdWithDetailsAsync(id);
            if (sprint == null)
                throw new Exception($"Sprint avec ID {id} non trouvé");

            return MapToSprintDto(sprint);
        }

        public async Task<IEnumerable<SprintDto>> GetSprintsByProjectIdAsync(int projectId)
        {
            var sprints = await _sprintRepository.GetByProjectIdAsync(projectId);
            return sprints.Select(MapToSprintDto);
        }

        public async Task<SprintDto> CreateSprintAsync(SprintCreateDto sprintDto)
        {
            var project = await _projectRepository.GetByIdAsync(sprintDto.ProjectId);
            if (project == null)
                throw new Exception($"Projet avec ID {sprintDto.ProjectId} non trouvé");

            var sprint = new Sprint
            {
                Name = sprintDto.Name,
                Description = sprintDto.Description,
                Status = SprintStatus.Todo,
                StartDate = sprintDto.StartDate,
                EndDate = sprintDto.EndDate,
                ProjectId = sprintDto.ProjectId,
                CreatedAt = DateTime.UtcNow
            };

            await _sprintRepository.AddAsync(sprint);

            // Récupérer le sprint avec tous les détails
            sprint = await _sprintRepository.GetByIdWithDetailsAsync(sprint.Id);
            return MapToSprintDto(sprint);
        }

        public async Task UpdateSprintAsync(int id, SprintUpdateDto sprintDto)
        {
            var sprint = await _sprintRepository.GetByIdAsync(id);
            if (sprint == null)
                throw new Exception($"Sprint avec ID {id} non trouvé");

            // Enregistrement de l'historique si le statut change
            if (Enum.TryParse<SprintStatus>(sprintDto.Status, out var newStatus) && sprint.Status != newStatus)
            {
                var history = new SprintHistory
                {
                    SprintId = sprint.Id,
                    OldStatus = sprint.Status,
                    NewStatus = newStatus,
                    Comments = "Mise à jour via API",
                    CreatedAt = DateTime.UtcNow
                };
                await _sprintHistoryRepository.AddAsync(history);

                sprint.Status = newStatus;
            }

            sprint.Name = sprintDto.Name;
            sprint.Description = sprintDto.Description;
            sprint.StartDate = sprintDto.StartDate;
            sprint.EndDate = sprintDto.EndDate;
            sprint.UpdatedAt = DateTime.UtcNow;

            await _sprintRepository.UpdateAsync(sprint);
        }

        public async Task UpdateSprintStatusAsync(int id, SprintStatusUpdateDto statusDto)
        {
            var sprint = await _sprintRepository.GetByIdAsync(id);
            if (sprint == null)
                throw new Exception($"Sprint avec ID {id} non trouvé");

            if (Enum.TryParse<SprintStatus>(statusDto.Status, out var newStatus) && sprint.Status != newStatus)
            {
                // Enregistrement de l'historique pour le changement de statut
                var history = new SprintHistory
                {
                    SprintId = sprint.Id,
                    OldStatus = sprint.Status,
                    NewStatus = newStatus,
                    Comments = statusDto.Comments ?? "Statut mis à jour via API",
                    CreatedAt = DateTime.UtcNow
                };
                await _sprintHistoryRepository.AddAsync(history);

                sprint.Status = newStatus;
                sprint.UpdatedAt = DateTime.UtcNow;
                await _sprintRepository.UpdateAsync(sprint);
            }
        }

        public async Task DeleteSprintAsync(int id)
        {
            var sprint = await _sprintRepository.GetByIdAsync(id);
            if (sprint == null)
                throw new Exception($"Sprint avec ID {id} non trouvé");

            await _sprintRepository.DeleteAsync(sprint);
        }

        private SprintDto MapToSprintDto(Sprint sprint)
        {
            return new SprintDto
            {
                Id = sprint.Id,
                Name = sprint.Name,
                Description = sprint.Description,
                Status = sprint.Status.ToString(),
                StartDate = sprint.StartDate,
                EndDate = sprint.EndDate,
                CreatedAt = sprint.CreatedAt,
                Tasks = sprint.Tasks?.Select(t => new TaskDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status.ToString(),
                    CreatedAt = t.CreatedAt,
                    AssignedTo = t.AssignedTo != null ? new UserSimpleDto
                    {
                        Id = t.AssignedTo.Id,
                        Username = t.AssignedTo.Username,
                        FirstName = t.AssignedTo.FirstName,
                        LastName = t.AssignedTo.LastName,
                        Email = t.AssignedTo.Email,
                        Role = t.AssignedTo.Role.ToString()
                    } : null
                }).ToList() ?? new List<TaskDto>()
            };
        }
    }
}
