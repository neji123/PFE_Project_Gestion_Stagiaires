
using PFE.application.DTOs;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
    public interface IJobOfferRecommendationService
    {
        Task<List<StagiaireRecommendationDto>> GenerateRecommendationsAsync(int jobOfferId, int topN = 5, bool regenerateIfExists = false);
        Task<JobOfferWithRecommendationsDto?> GetJobOfferWithRecommendationsAsync(int jobOfferId);
        Task<StagiaireRecommendationDto> UpdateRecommendationStatusAsync(int recommendationId, UpdateRecommendationStatusRequest request);
        Task<bool> DeleteRecommendationsAsync(int jobOfferId);
        Task<List<JobOfferWithRecommendationsDto>> GetAllJobOffersWithRecommendationsAsync();


    }
}
