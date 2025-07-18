using PFE.application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
   public interface IReportService
    {
        Task<ReportDto> UploadReportAsync(ReportUploadDto uploadDto);
        Task<ReportDto> GetReportByIdAsync(int id);
        Task<IEnumerable<ReportDto>> GetReportsByStagiaireAsync(int stagiaireId);
        Task<ReportDto> ApproveReportAsync(int reportId, string feedback, int approverId);
        Task<TimelineDto> GetStagiaireTimelineAsync(int stagiaireId);
        Task<bool> DeleteReportAsync(int reportId);

        Task<IEnumerable<ReportDto>> GetAllReportsAsync();
        Task<IEnumerable<ReportDto>> GetReportsByTuteurAsync(int tuteurId);
        Task<ReportDto> RejectReportAsync(int reportId, string feedback, int approverId);
        Task<ReportDto> ResubmitReportAsync(ReportResubmitDto resubmitDto);
    }
}
