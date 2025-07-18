using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;

namespace PFE.Infrastructure.Repositories
{
    public class JobOfferRecommendationRepository : IJobOfferRecommendationRepository
    {
        private readonly ApplicationDbContext _context;

        public JobOfferRecommendationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<JobOfferRecommendation>> GetRecommendationsByJobOfferIdAsync(int jobOfferId)
        {
            return await _context.JobOfferRecommendations
                .Include(r => r.Stagiaire)
                    .ThenInclude(s => s.Department)
                .Include(r => r.Stagiaire)
                    .ThenInclude(s => s.University)
                .Include(r => r.JobOffer)
                    .ThenInclude(jo => jo.Department)
                .Where(r => r.JobOfferId == jobOfferId && r.IsActive)
                .OrderBy(r => r.RecommendationRank)
                .ToListAsync();
        }

        // ✨ NOUVELLES MÉTHODES AJOUTÉES pour correspondre à l'interface

        public async Task<JobOfferRecommendation?> GetRecommendationByIdAsync(int id)
        {
            return await _context.JobOfferRecommendations
                .Include(r => r.Stagiaire)
                    .ThenInclude(s => s.Department)
                .Include(r => r.Stagiaire)
                    .ThenInclude(s => s.University)
                .Include(r => r.JobOffer)
                    .ThenInclude(jo => jo.Department)
                .FirstOrDefaultAsync(r => r.Id == id && r.IsActive);
        }

        public async Task<JobOfferRecommendation> CreateRecommendationAsync(JobOfferRecommendation recommendation)
        {
            // S'assurer que IsActive est true par défaut
            recommendation.IsActive = true;
            recommendation.GeneratedAt = DateTime.UtcNow;

            _context.JobOfferRecommendations.Add(recommendation);
            await _context.SaveChangesAsync();
            return recommendation;
        }

        public async Task<JobOfferRecommendation> UpdateRecommendationAsync(JobOfferRecommendation recommendation)
        {
            _context.JobOfferRecommendations.Update(recommendation);
            await _context.SaveChangesAsync();
            return recommendation;
        }

        // Méthodes existantes conservées avec alias pour compatibilité
        public async Task<JobOfferRecommendation> GetByIdAsync(int id)
        {
            var result = await GetRecommendationByIdAsync(id);
            return result ?? throw new InvalidOperationException($"Recommendation {id} not found");
        }

        public async Task<JobOfferRecommendation> CreateAsync(JobOfferRecommendation recommendation)
        {
            return await CreateRecommendationAsync(recommendation);
        }

        public async Task<JobOfferRecommendation> UpdateAsync(JobOfferRecommendation recommendation)
        {
            return await UpdateRecommendationAsync(recommendation);
        }

        public async Task DeleteRecommendationsByJobOfferIdAsync(int jobOfferId)
        {
            var recommendations = await _context.JobOfferRecommendations
                .Where(r => r.JobOfferId == jobOfferId)
                .ToListAsync();

            // Soft delete : marquer comme inactif au lieu de supprimer
            foreach (var rec in recommendations)
            {
                rec.IsActive = false;
            }

            await _context.SaveChangesAsync();
        }

        public async Task<bool> HasRecommendationsAsync(int jobOfferId)
        {
            return await _context.JobOfferRecommendations
                .AnyAsync(r => r.JobOfferId == jobOfferId && r.IsActive);
        }

        public async Task<List<JobOfferRecommendation>> GetTopRecommendationsAsync(int jobOfferId, int topN)
        {
            return await _context.JobOfferRecommendations
                .Include(r => r.Stagiaire)
                    .ThenInclude(s => s.Department)
                .Include(r => r.Stagiaire)
                    .ThenInclude(s => s.University)
                .Where(r => r.JobOfferId == jobOfferId && r.IsActive)
                .OrderBy(r => r.RecommendationRank)
                .Take(topN)
                .ToListAsync();
        }

        // ✨ MÉTHODES SUPPLÉMENTAIRES pour les statistiques
        public async Task<int> GetRecommendationCountByJobOfferIdAsync(int jobOfferId)
        {
            return await _context.JobOfferRecommendations
                .CountAsync(r => r.JobOfferId == jobOfferId && r.IsActive);
        }

        public async Task<List<JobOfferRecommendation>> GetViewedRecommendationsAsync(int jobOfferId)
        {
            return await _context.JobOfferRecommendations
                .Include(r => r.Stagiaire)
                .Where(r => r.JobOfferId == jobOfferId && r.IsActive && r.IsViewed)
                .OrderBy(r => r.RecommendationRank)
                .ToListAsync();
        }

        public async Task<List<JobOfferRecommendation>> GetContactedRecommendationsAsync(int jobOfferId)
        {
            return await _context.JobOfferRecommendations
                .Include(r => r.Stagiaire)
                .Where(r => r.JobOfferId == jobOfferId && r.IsActive && r.IsContacted)
                .OrderBy(r => r.RecommendationRank)
                .ToListAsync();
        }

        public async Task<List<JobOfferRecommendation>> GetSelectedRecommendationsAsync(int jobOfferId)
        {
            return await _context.JobOfferRecommendations
                .Include(r => r.Stagiaire)
                .Where(r => r.JobOfferId == jobOfferId && r.IsActive && r.IsSelected)
                .OrderBy(r => r.RecommendationRank)
                .ToListAsync();
        }
        public async Task<List<JobOffer>> GetAllJobOffersAsync()
        {
            return await _context.JobOffers
                .Include(jo => jo.Department)
                .ToListAsync();
        }

    }
}