using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface ISprintRepository
    {
        Task<IEnumerable<Sprint>> GetAllAsync();
        Task<Sprint> GetByIdAsync(int id);
        Task<Sprint> GetByIdWithDetailsAsync(int id);
        Task<IEnumerable<Sprint>> GetByProjectIdAsync(int projectId);
        Task AddAsync(Sprint sprint);
        Task UpdateAsync(Sprint sprint);
        Task DeleteAsync(Sprint sprint);
    

    }
}
