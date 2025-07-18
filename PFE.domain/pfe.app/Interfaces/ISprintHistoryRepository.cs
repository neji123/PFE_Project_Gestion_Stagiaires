using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface ISprintHistoryRepository
    {
        Task<IEnumerable<SprintHistory>> GetBySprintIdAsync(int sprintId);
        Task AddAsync(SprintHistory sprintHistory);
    }
}
