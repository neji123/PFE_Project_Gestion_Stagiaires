using System.Collections.Generic;
using System.Threading.Tasks;
using TaskEntity = PFE.domain.Entities.ProjectTask;

namespace PFE.Application.Interfaces
{
    public interface ITaskRepository
    {
        Task<IEnumerable<TaskEntity>> GetAllAsync();
        Task<TaskEntity> GetByIdAsync(int id);
        Task<TaskEntity> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<TaskEntity>> GetBySprintIdAsync(int sprintId);
        Task<IEnumerable<TaskEntity>> GetTasksAssignedToUserAsync(int userId);
        Task AddAsync(TaskEntity task);
        Task UpdateAsync(TaskEntity task);
        Task DeleteAsync(TaskEntity task);
    }
}
