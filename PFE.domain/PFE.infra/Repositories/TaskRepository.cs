using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using TaskEntity = PFE.domain.Entities.ProjectTask;
using PFE.infracstructure.Persistence;

namespace PFE.infracstructure.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public TaskRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<TaskEntity>> GetAllAsync()
        {
            return await _dbContext.Tasks
                .Include(t => t.AssignedTo)
                .Include(t => t.Sprint)
                .ToListAsync();
        }

        public async Task<TaskEntity> GetByIdAsync(int id)
        {
            return await _dbContext.Tasks
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<TaskEntity> GetByIdWithDetailsAsync(int id)
        {
            return await _dbContext.Tasks
                .Include(t => t.AssignedTo)
                .Include(t => t.Sprint)
                    .ThenInclude(s => s.Project)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<IEnumerable<TaskEntity>> GetBySprintIdAsync(int sprintId)
        {
            return await _dbContext.Tasks
                .Include(t => t.AssignedTo)
                .Where(t => t.SprintId == sprintId)
                .ToListAsync();
        }

        public async Task<IEnumerable<TaskEntity>> GetTasksAssignedToUserAsync(int userId)
        {
            return await _dbContext.Tasks
                .Include(t => t.Sprint)
                    .ThenInclude(s => s.Project)
                .Where(t => t.AssignedToId == userId)
                .ToListAsync();
        }

        public async Task AddAsync(TaskEntity task)
        {
            await _dbContext.Tasks.AddAsync(task);
            await _dbContext.SaveChangesAsync();
        }

        public async Task UpdateAsync(TaskEntity task)
        {
            _dbContext.Tasks.Update(task);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteAsync(TaskEntity task)
        {
            _dbContext.Tasks.Remove(task);
            await _dbContext.SaveChangesAsync();
        }
    }
}
