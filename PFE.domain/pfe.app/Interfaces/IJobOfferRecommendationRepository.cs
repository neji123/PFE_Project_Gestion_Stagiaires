using PFE.domain.Entities;

namespace PFE.Application.Interfaces
{
    public interface IJobOfferRecommendationRepository
    {
        Task<List<JobOfferRecommendation>> GetRecommendationsByJobOfferIdAsync(int jobOfferId);
        Task<JobOfferRecommendation?> GetRecommendationByIdAsync(int id);
        Task<JobOfferRecommendation> CreateRecommendationAsync(JobOfferRecommendation recommendation);
        Task<JobOfferRecommendation> UpdateRecommendationAsync(JobOfferRecommendation recommendation);
        Task DeleteRecommendationsByJobOfferIdAsync(int jobOfferId);
        Task<bool> HasRecommendationsAsync(int jobOfferId);
        Task<List<JobOfferRecommendation>> GetTopRecommendationsAsync(int jobOfferId, int topN);

        // Méthodes existantes pour compatibilité
        Task<JobOfferRecommendation> GetByIdAsync(int id);
        Task<JobOfferRecommendation> CreateAsync(JobOfferRecommendation recommendation);
        Task<JobOfferRecommendation> UpdateAsync(JobOfferRecommendation recommendation);
    
    }
}