using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PFE.infrastructure.Repositories
{
    public class ReportTypeRepository : IReportTypeRepository
    {
        private readonly ApplicationDbContext _context;

        public ReportTypeRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ReportType> GetByIdAsync(int id)
        {
            return await _context.ReportTypes
                .FirstOrDefaultAsync(rt => rt.Id == id);
        }

        public async Task<IEnumerable<ReportType>> GetAllAsync()
        {
            return await _context.ReportTypes
                .OrderBy(rt => rt.DisplayOrder)
                .ToListAsync();
        }

        public async Task<IEnumerable<ReportType>> GetActiveAsync()
        {
            return await _context.ReportTypes
                .Where(rt => rt.IsActive)
                .OrderBy(rt => rt.DisplayOrder)
                .ToListAsync();
        }

        public async Task<IEnumerable<ReportType>> GetByDisplayOrderAsync()
        {
            return await _context.ReportTypes
                .OrderBy(rt => rt.DisplayOrder)
                .ToListAsync();
        }

        public async Task<ReportType> AddAsync(ReportType reportType)
        {
            _context.ReportTypes.Add(reportType);
            await _context.SaveChangesAsync();
            return reportType;
        }

        public async Task UpdateAsync(ReportType reportType)
        {
            reportType.UpdatedAt = System.DateTime.UtcNow;
            _context.ReportTypes.Update(reportType);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(ReportType reportType)
        {
            _context.ReportTypes.Remove(reportType);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.ReportTypes.AnyAsync(rt => rt.Id == id);
        }

        public async Task<bool> ExistsByNameAsync(string name, int? excludeId = null)
        {
            var query = _context.ReportTypes.Where(rt => rt.Name.ToLower() == name.ToLower());

            if (excludeId.HasValue)
            {
                query = query.Where(rt => rt.Id != excludeId.Value);
            }

            return await query.AnyAsync();
        }

        public async Task<int> GetMaxDisplayOrderAsync()
        {
            if (!await _context.ReportTypes.AnyAsync())
                return 0;

            return await _context.ReportTypes.MaxAsync(rt => rt.DisplayOrder);
        }
    }
}