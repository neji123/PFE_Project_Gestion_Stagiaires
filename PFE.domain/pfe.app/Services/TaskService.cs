using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using TaskEntity = PFE.domain.Entities.ProjectTask;
using TaskStatus = PFE.domain.Entities.TaskStatus;

namespace PFE.Application.Services
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _taskRepository;
        private readonly ISprintRepository _sprintRepository;
        private readonly IUserRepository _userRepository;

        public TaskService(
            ITaskRepository taskRepository,
            ISprintRepository sprintRepository,
            IUserRepository userRepository)
        {
            _taskRepository = taskRepository;
            _sprintRepository = sprintRepository;
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<TaskDto>> GetAllTasksAsync()
        {
            var tasks = await _taskRepository.GetAllAsync();
            return tasks.Select(MapToTaskDto);
        }

        public async Task<TaskDto> GetTaskByIdAsync(int id)
        {
            var task = await _taskRepository.GetByIdWithDetailsAsync(id);
            if (task == null)
                throw new Exception($"Tâche avec ID {id} non trouvée");

            return MapToTaskDto(task);
        }

        public async Task<IEnumerable<TaskDto>> GetTasksBySprintIdAsync(int sprintId)
        {
            var tasks = await _taskRepository.GetBySprintIdAsync(sprintId);
            return tasks.Select(MapToTaskDto);
        }

        public async Task<IEnumerable<TaskDto>> GetTasksAssignedToUserAsync(int userId)
        {
            var tasks = await _taskRepository.GetTasksAssignedToUserAsync(userId);
            return tasks.Select(MapToTaskDto);
        }

        public async Task<TaskDto> CreateTaskAsync(TaskCreateDto taskDto)
        {
            var sprint = await _sprintRepository.GetByIdAsync(taskDto.SprintId);
            if (sprint == null)
                throw new Exception($"Sprint avec ID {taskDto.SprintId} non trouvé");

            // Vérifier que l'utilisateur assigné existe s'il est spécifié
            if (taskDto.AssignedToId.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(taskDto.AssignedToId.Value);
                if (user == null)
                    throw new Exception($"Utilisateur avec ID {taskDto.AssignedToId.Value} non trouvé");
            }

            var task = new TaskEntity
            {
                Title = taskDto.Title,
                Description = taskDto.Description,
                Status = TaskStatus.Todo,
                SprintId = taskDto.SprintId,
                AssignedToId = taskDto.AssignedToId,
                CreatedAt = DateTime.UtcNow
            };

            await _taskRepository.AddAsync(task);

            // Récupérer la tâche avec tous les détails
            task = await _taskRepository.GetByIdWithDetailsAsync(task.Id);
            return MapToTaskDto(task);
        }

        public async Task UpdateTaskAsync(int id, TaskUpdateDto taskDto)
        {
            var task = await _taskRepository.GetByIdAsync(id);
            if (task == null)
                throw new Exception($"Tâche avec ID {id} non trouvée");

            // Vérifier que l'utilisateur assigné existe s'il est spécifié
            if (taskDto.AssignedToId.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(taskDto.AssignedToId.Value);
                if (user == null)
                    throw new Exception($"Utilisateur avec ID {taskDto.AssignedToId.Value} non trouvé");
            }

            task.Title = taskDto.Title;
            task.Description = taskDto.Description;
            task.AssignedToId = taskDto.AssignedToId;
            task.UpdatedAt = DateTime.UtcNow;

            if (Enum.TryParse<TaskStatus>(taskDto.Status, out var status))
            {
                task.Status = status;
            }

            await _taskRepository.UpdateAsync(task);
        }

        public async Task DeleteTaskAsync(int id)
        {
            var task = await _taskRepository.GetByIdAsync(id);
            if (task == null)
                throw new Exception($"Tâche avec ID {id} non trouvée");

            await _taskRepository.DeleteAsync(task);
        }

        private TaskDto MapToTaskDto(TaskEntity task)
        {
            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status.ToString(),
                CreatedAt = task.CreatedAt,
                AssignedTo = task.AssignedTo != null ? new UserSimpleDto
                {
                    Id = task.AssignedTo.Id,
                    Username = task.AssignedTo.Username,
                    FirstName = task.AssignedTo.FirstName,
                    LastName = task.AssignedTo.LastName,
                    Email = task.AssignedTo.Email,
                    Role = task.AssignedTo.Role.ToString()
                } : null
            };
        }
    }
}
