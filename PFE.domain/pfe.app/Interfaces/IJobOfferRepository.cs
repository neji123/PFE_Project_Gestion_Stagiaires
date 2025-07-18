using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface IJobOfferRepository
    {
        Task<JobOffer> GetByIdAsync(int id);
        Task<IEnumerable<JobOffer>> GetAllAsync();
        Task<IEnumerable<JobOffer>> GetByDepartmentAsync(int departmentId);
        Task<IEnumerable<JobOffer>> GetByPublisherAsync(int publisherId);
        Task<JobOffer> AddAsync(JobOffer jobOffer);
        Task<JobOffer> UpdateAsync(JobOffer jobOffer);
        Task<bool> DeleteAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task<IEnumerable<JobOffer>> GetRecentAsync(int count = 10);
        Task<List<JobOffer>> GetAllJobOffersAsync();

    }
}