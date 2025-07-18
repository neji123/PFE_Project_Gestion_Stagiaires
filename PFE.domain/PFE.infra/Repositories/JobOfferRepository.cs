using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;
using Polly;

namespace PFE.infracstructure.Repositories
{
    public class JobOfferRepository : IJobOfferRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public JobOfferRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<JobOffer> GetByIdAsync(int id)
        {
            return await _dbContext.JobOffers
                .Include(j => j.Department)
                .Include(j => j.PublishedBy)
                .FirstOrDefaultAsync(j => j.Id == id);
        }

        public async Task<IEnumerable<JobOffer>> GetAllAsync()
        {
            return await _dbContext.JobOffers
                .Include(j => j.Department)
                .Include(j => j.PublishedBy)
                .OrderByDescending(j => j.PublishedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<JobOffer>> GetByDepartmentAsync(int departmentId)
        {
            return await _dbContext.JobOffers
                .Include(j => j.Department)
                .Include(j => j.PublishedBy)
                .Where(j => j.DepartmentId == departmentId)
                .OrderByDescending(j => j.PublishedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<JobOffer>> GetByPublisherAsync(int publisherId)
        {
            return await _dbContext.JobOffers
                .Include(j => j.Department)
                .Include(j => j.PublishedBy)
                .Where(j => j.PublishedByUserId == publisherId)
                .OrderByDescending(j => j.PublishedAt)
                .ToListAsync();
        }

        public async Task<JobOffer> AddAsync(JobOffer jobOffer)
        {
            _dbContext.JobOffers.Add(jobOffer);
            await _dbContext.SaveChangesAsync();

            // Recharger avec les relations
            return await GetByIdAsync(jobOffer.Id);
        }

        public async Task<JobOffer> UpdateAsync(JobOffer jobOffer)
        {
            _dbContext.JobOffers.Update(jobOffer);
            await _dbContext.SaveChangesAsync();

            // Recharger avec les relations
            return await GetByIdAsync(jobOffer.Id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var jobOffer = await _dbContext.JobOffers.FindAsync(id);
            if (jobOffer == null)
                return false;

            _dbContext.JobOffers.Remove(jobOffer);
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _dbContext.JobOffers.AnyAsync(j => j.Id == id);
        }

        public async Task<IEnumerable<JobOffer>> GetRecentAsync(int count = 10)
        {
            return await _dbContext.JobOffers
                .Include(j => j.Department)
                .Include(j => j.PublishedBy)
                .OrderByDescending(j => j.PublishedAt)
                .Take(count)
                .ToListAsync();
        }
        public async Task<List<JobOffer>> GetAllJobOffersAsync()
        {
            return await _dbContext.JobOffers
                .Include(jo => jo.Department)
               
                .ToListAsync();
        }

    }
}