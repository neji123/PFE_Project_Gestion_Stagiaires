using PFE.Application.DTOs;

namespace PFE.Application.Interfaces
{
    public interface IJobOfferService
    {
        Task<JobOfferDto> GetJobOfferByIdAsync(int id);
        Task<IEnumerable<JobOfferDto>> GetAllJobOffersAsync();
        Task<IEnumerable<JobOfferDto>> GetJobOffersByDepartmentAsync(int departmentId);
        Task<IEnumerable<JobOfferDto>> GetJobOffersByPublisherAsync(int publisherId);
        Task<IEnumerable<JobOfferSimpleDto>> GetRecentJobOffersAsync(int count = 10);
        Task<JobOfferDto> CreateJobOfferAsync(CreateJobOfferDto createDto, int publisherId);
        Task<JobOfferDto> UpdateJobOfferAsync(int id, UpdateJobOfferDto updateDto, int currentUserId);
        Task<bool> DeleteJobOfferAsync(int id, int currentUserId);
    }
}