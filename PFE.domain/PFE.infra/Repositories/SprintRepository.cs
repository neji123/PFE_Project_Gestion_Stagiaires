using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;

namespace PFE.infracstructure.Repositories
{
    public class SprintRepository : ISprintRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public SprintRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Sprint>> GetAllAsync()
        {
            return await _dbContext.Sprints
                .Include(s => s.Tasks)
                    .ThenInclude(t => t.AssignedTo)
                .Include(s => s.Project)
                .ToListAsync();
        }

        public async Task<Sprint> GetByIdAsync(int id)
        {
            return await _dbContext.Sprints
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Sprint> GetByIdWithDetailsAsync(int id)
        {
            return await _dbContext.Sprints
                .Include(s => s.Tasks)
                    .ThenInclude(t => t.AssignedTo)
                .Include(s => s.Project)
                .Include(s => s.SprintHistories)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<IEnumerable<Sprint>> GetByProjectIdAsync(int projectId)
        {
            return await _dbContext.Sprints
                .Include(s => s.Tasks)
                    .ThenInclude(t => t.AssignedTo)
                .Where(s => s.ProjectId == projectId)
                .ToListAsync();
        }

        public async Task AddAsync(Sprint sprint)
        {
            await _dbContext.Sprints.AddAsync(sprint);
            await _dbContext.SaveChangesAsync();
        }

        public async Task UpdateAsync(Sprint sprint)
        {
            _dbContext.Sprints.Update(sprint);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteAsync(Sprint sprint)
        {
            _dbContext.Sprints.Remove(sprint);
            await _dbContext.SaveChangesAsync();
        }
    }
}
