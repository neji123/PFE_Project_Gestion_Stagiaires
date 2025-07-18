using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;

namespace PFE.infracstructure.Repositories
{
    public class SprintHistoryRepository : ISprintHistoryRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public SprintHistoryRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<SprintHistory>> GetBySprintIdAsync(int sprintId)
        {
            return await _dbContext.SprintHistories
                .Where(sh => sh.SprintId == sprintId)
                .OrderByDescending(sh => sh.CreatedAt)
                .ToListAsync();
        }

        public async Task AddAsync(SprintHistory sprintHistory)
        {
            await _dbContext.SprintHistories.AddAsync(sprintHistory);
            await _dbContext.SaveChangesAsync();
        }
    }
}
