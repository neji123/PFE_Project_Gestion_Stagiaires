// PFE.Application.Interfaces/IReportRepository.cs - Version corrigée
using PFE.domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PFE.Application.Interfaces
{
    public interface IReportRepository
    {
        Task<Report> GetByIdAsync(int id);
        Task<IEnumerable<Report>> GetByStagiaireAsync(int stagiaireId);
        Task<Report> GetByTypeAndStagiaireAsync(int reportTypeId, int stagiaireId);
        Task<Report> AddAsync(Report report);
        Task UpdateAsync(Report report);
        Task DeleteAsync(Report report);
        Task<StageTimeline> GetTimelineByStagiaireAsync(int stagiaireId);
        Task<StageTimeline> CreateTimelineAsync(StageTimeline timeline);
        Task<StageTimeline> UpdateTimelineAsync(StageTimeline timeline);
        Task<IEnumerable<Report>> GetAllReportsAsync();
        Task<IEnumerable<Report>> GetReportsByApproverIdAsync(int approverId);
        Task<IEnumerable<Report>> GetRecentReportsAsync(int count);
        Task<IEnumerable<Report>> GetPendingReportsByApproverIdAsync(int approverId);
        Task<Dictionary<string, int>> GetReportCompletionStatsByStagiaireAsync(int stagiaireId);

        // Nouvelles méthodes pour supporter la nouvelle structure
        Task<IEnumerable<Report>> GetReportsByTypeAsync(int reportTypeId);
        Task<bool> HasReportsOfTypeAsync(int reportTypeId);
    
    }
}