using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using PFE.domain.Entities;
namespace PFE.application.Interfaces
{
   public interface IRecommendationService
    {
        Task<RecommendationResponse> GetRecommendationsAsync(RecommendationRequest request);
        Task<bool> IsRecommendationServiceHealthyAsync();
  

    }
}
