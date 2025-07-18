using PFE.domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PFE.Application.Interfaces
{
    public interface IReportTypeRepository
    {
        Task<ReportType> GetByIdAsync(int id);
        Task<IEnumerable<ReportType>> GetAllAsync();
        Task<IEnumerable<ReportType>> GetActiveAsync();
        Task<IEnumerable<ReportType>> GetByDisplayOrderAsync();
        Task<ReportType> AddAsync(ReportType reportType);
        Task UpdateAsync(ReportType reportType);
        Task DeleteAsync(ReportType reportType);
        Task<bool> ExistsAsync(int id);
        Task<bool> ExistsByNameAsync(string name, int? excludeId = null);
        Task<int> GetMaxDisplayOrderAsync();
    }
}
