// PFE.infrastructure.Repositories/ReportRepository.cs - Version corrigée sans doublons
using Microsoft.EntityFrameworkCore;
using PFE.application.Interfaces;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PFE.infrastructure.Repositories
{
    public class ReportRepository : IReportRepository
    {
        private readonly ApplicationDbContext _context;

        public ReportRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Report> GetByIdAsync(int id)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType) // Inclure le type de rapport
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<Report>> GetByStagiaireAsync(int stagiaireId)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType) // Inclure le type de rapport
                .Where(r => r.StagiaireId == stagiaireId)
                .OrderBy(r => r.ReportType.DisplayOrder)
                .ToListAsync();
        }

        public async Task<Report> GetByTypeAndStagiaireAsync(int reportTypeId, int stagiaireId)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType)
                .FirstOrDefaultAsync(r => r.ReportTypeId == reportTypeId && r.StagiaireId == stagiaireId);
        }

        public async Task<Report> AddAsync(Report report)
        {
            report.CreatedAt = System.DateTime.UtcNow;
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return report;
        }

        public async Task UpdateAsync(Report report)
        {
            report.UpdatedAt = System.DateTime.UtcNow;
            _context.Reports.Update(report);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Report report)
        {
            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();
        }

        public async Task<StageTimeline> GetTimelineByStagiaireAsync(int stagiaireId)
        {
            return await _context.StageTimelines
                .Include(t => t.Stagiaire)
                .Include(t => t.Reports)
                .FirstOrDefaultAsync(t => t.StagiaireId == stagiaireId);
        }

        public async Task<StageTimeline> CreateTimelineAsync(StageTimeline timeline)
        {
            _context.StageTimelines.Add(timeline);
            await _context.SaveChangesAsync();
            return timeline;
        }

        public async Task<StageTimeline> UpdateTimelineAsync(StageTimeline timeline)
        {
            _context.StageTimelines.Update(timeline);
            await _context.SaveChangesAsync();
            return timeline;
        }

        public async Task<IEnumerable<Report>> GetAllReportsAsync()
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType)
                .OrderByDescending(r => r.SubmissionDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Report>> GetReportsByApproverIdAsync(int approverId)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType)
                .Where(r => r.ApproverId == approverId)
                .OrderByDescending(r => r.SubmissionDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Report>> GetRecentReportsAsync(int count)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType)
                .OrderByDescending(r => r.SubmissionDate)
                .Take(count)
                .ToListAsync();
        }

        public async Task<IEnumerable<Report>> GetPendingReportsByApproverIdAsync(int approverId)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.ReportType)
                .Where(r => r.ApproverId == approverId && r.IsSubmitted && !r.IsApproved && !r.IsRejected)
                .ToListAsync();
        }

        public async Task<Dictionary<string, int>> GetReportCompletionStatsByStagiaireAsync(int stagiaireId)
        {
            var reports = await GetByStagiaireAsync(stagiaireId);

            return new Dictionary<string, int>
            {
                ["submitted"] = reports.Count(r => r.IsSubmitted),
                ["approved"] = reports.Count(r => r.IsApproved),
                ["rejected"] = reports.Count(r => r.IsRejected),
                ["pending"] = reports.Count(r => r.IsSubmitted && !r.IsApproved && !r.IsRejected)
            };
        }

        // Nouvelles méthodes pour supporter la nouvelle structure (UNE SEULE FOIS)
        public async Task<IEnumerable<Report>> GetReportsByTypeAsync(int reportTypeId)
        {
            return await _context.Reports
                .Include(r => r.Stagiaire)
                .Include(r => r.Approver)
                .Include(r => r.ReportType)
                .Where(r => r.ReportTypeId == reportTypeId)
                .OrderByDescending(r => r.SubmissionDate)
                .ToListAsync();
        }

        public async Task<bool> HasReportsOfTypeAsync(int reportTypeId)
        {
            return await _context.Reports.AnyAsync(r => r.ReportTypeId == reportTypeId);
        }
    }
}