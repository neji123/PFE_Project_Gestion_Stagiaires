using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.Application.DTOs;

namespace PFE.Application.Interfaces
{
    public interface ITaskService
    {
        Task<IEnumerable<TaskDto>> GetAllTasksAsync();
        Task<TaskDto> GetTaskByIdAsync(int id);
        Task<IEnumerable<TaskDto>> GetTasksBySprintIdAsync(int sprintId);
        Task<IEnumerable<TaskDto>> GetTasksAssignedToUserAsync(int userId);
        Task<TaskDto> CreateTaskAsync(TaskCreateDto taskDto);
        Task UpdateTaskAsync(int id, TaskUpdateDto taskDto);
        Task DeleteTaskAsync(int id);
    }
}
