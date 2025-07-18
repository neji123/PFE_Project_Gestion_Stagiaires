using Microsoft.EntityFrameworkCore;
using PFE.application.DTOs; 
using PFE.application.Interfaces;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;

namespace PFE.Infrastructure.Repositories
{
    public class RatingRepository : IRatingRepository
    {
        private readonly ApplicationDbContext _context;

        public RatingRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        #region CRUD de base

        public async Task<Rating> GetByIdAsync(int id)
        {
            return await _context.Ratings.FindAsync(id);
        }

        public async Task<Rating> GetByIdWithDetailsAsync(int id)
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Include(r => r.ApprovedByUser)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<Rating>> GetAllAsync()
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<Rating> AddAsync(Rating rating)
        {
            _context.Ratings.Add(rating);
            await _context.SaveChangesAsync();
            return rating;
        }

        public async Task<Rating> UpdateAsync(Rating rating)
        {
            rating.UpdatedAt = DateTime.UtcNow;
            _context.Entry(rating).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return rating;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var rating = await _context.Ratings.FindAsync(id);
            if (rating == null) return false;

            _context.Ratings.Remove(rating);
            await _context.SaveChangesAsync();
            return true;
        }

        #endregion

        #region Requêtes spécifiques

        public async Task<IEnumerable<Rating>> GetRatingsByEvaluatorAsync(int evaluatorId)
        {
            return await _context.Ratings
                .Include(r => r.EvaluatedUser)
                .Where(r => r.EvaluatorId == evaluatorId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetRatingsByEvaluatedUserAsync(int evaluatedUserId)
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Where(r => r.EvaluatedUserId == evaluatedUserId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetRatingsByTypeAsync(EvaluationType type)
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Where(r => r.Type == type)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetRatingsByStatusAsync(RatingStatus status)
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Where(r => r.Status == status)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        #endregion

        #region Recherche avancée avec filtres

        public async Task<(IEnumerable<Rating> ratings, int totalCount)> GetRatingsWithFiltersAsync(RatingFilterDto filters)
        {
            var query = _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Include(r => r.ApprovedByUser)
                .AsQueryable();

            // Appliquer les filtres
            if (filters.EvaluatorId.HasValue)
                query = query.Where(r => r.EvaluatorId == filters.EvaluatorId.Value);

            if (filters.EvaluatedUserId.HasValue)
                query = query.Where(r => r.EvaluatedUserId == filters.EvaluatedUserId.Value);

            if (filters.Type.HasValue)
                query = query.Where(r => r.Type == filters.Type.Value);

            if (filters.Status.HasValue)
                query = query.Where(r => r.Status == filters.Status.Value);

            if (filters.FromDate.HasValue)
                query = query.Where(r => r.CreatedAt >= filters.FromDate.Value);

            if (filters.ToDate.HasValue)
                query = query.Where(r => r.CreatedAt <= filters.ToDate.Value);

            if (filters.MinScore.HasValue)
                query = query.Where(r => r.Score >= filters.MinScore.Value);

            if (filters.MaxScore.HasValue)
                query = query.Where(r => r.Score <= filters.MaxScore.Value);

            if (!string.IsNullOrEmpty(filters.StageReference))
                query = query.Where(r => r.StageReference == filters.StageReference);

            // Compter le total avant pagination
            var totalCount = await query.CountAsync();

            // Appliquer le tri
            query = ApplySorting(query, filters.SortBy, filters.SortDescending);

            // Appliquer la pagination
            var ratings = await query
                .Skip((filters.PageNumber - 1) * filters.PageSize)
                .Take(filters.PageSize)
                .ToListAsync();

            return (ratings, totalCount);
        }

        private IQueryable<Rating> ApplySorting(IQueryable<Rating> query, string sortBy, bool sortDescending)
        {
            return sortBy?.ToLower() switch
            {
                "score" => sortDescending ? query.OrderByDescending(r => r.Score) : query.OrderBy(r => r.Score),
                "createdat" => sortDescending ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt),
                "status" => sortDescending ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status),
                "type" => sortDescending ? query.OrderByDescending(r => r.Type) : query.OrderBy(r => r.Type),
                "evaluatorname" => sortDescending ? query.OrderByDescending(r => r.Evaluator.FirstName) : query.OrderBy(r => r.Evaluator.FirstName),
                "evaluatedusername" => sortDescending ? query.OrderByDescending(r => r.EvaluatedUser.FirstName) : query.OrderBy(r => r.EvaluatedUser.FirstName),
                _ => sortDescending ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt)
            };
        }

        #endregion

        #region Vérifications de business rules

        public async Task<bool> HasUserAlreadyRatedAsync(int evaluatorId, int evaluatedUserId, EvaluationType type, DateTime? periodStart = null, DateTime? periodEnd = null)
        {
            var query = _context.Ratings
                .Where(r => r.EvaluatorId == evaluatorId &&
                           r.EvaluatedUserId == evaluatedUserId &&
                           r.Type == type);

            if (periodStart.HasValue && periodEnd.HasValue)
            {
                query = query.Where(r => r.EvaluationPeriodStart >= periodStart && r.EvaluationPeriodEnd <= periodEnd);
            }

            return await query.AnyAsync();
        }

        public async Task<bool> CanUserRateAsync(int evaluatorId, int evaluatedUserId, EvaluationType type)
        {
            var evaluator = await _context.Users.FindAsync(evaluatorId);
            var evaluatedUser = await _context.Users.FindAsync(evaluatedUserId);

            if (evaluator == null || evaluatedUser == null) return false;

            return type switch
            {
                EvaluationType.TuteurToStagiaire =>
                    evaluator.Role == UserRole.Tuteur &&
                    evaluatedUser.Role == UserRole.Stagiaire &&
                    evaluatedUser.TuteurId == evaluatorId,

                EvaluationType.RHToStagiaire =>
                    evaluator.Role == UserRole.RHs &&
                    evaluatedUser.Role == UserRole.Stagiaire,

                EvaluationType.StagiaireToTuteur =>
                    evaluator.Role == UserRole.Stagiaire &&
                    evaluatedUser.Role == UserRole.Tuteur &&
                    evaluator.TuteurId == evaluatedUserId,

                _ => false
            };
        }

        public async Task<Rating?> GetExistingRatingAsync(int evaluatorId, int evaluatedUserId, EvaluationType type, DateTime? periodStart = null, DateTime? periodEnd = null)
        {
            var query = _context.Ratings
                .Where(r => r.EvaluatorId == evaluatorId &&
                           r.EvaluatedUserId == evaluatedUserId &&
                           r.Type == type);

            if (periodStart.HasValue && periodEnd.HasValue)
            {
                query = query.Where(r => r.EvaluationPeriodStart >= periodStart && r.EvaluationPeriodEnd <= periodEnd);
            }

            return await query.FirstOrDefaultAsync();
        }

        #endregion

        #region Statistiques

        public async Task<double> GetAverageRatingForUserAsync(int userId, EvaluationType? type = null)
        {
            var query = _context.Ratings
                .Where(r => r.EvaluatedUserId == userId && r.Status == RatingStatus.Approved);

            if (type.HasValue)
                query = query.Where(r => r.Type == type.Value);

            if (!await query.AnyAsync()) return 0;

            return await query.AverageAsync(r => r.Score);
        }

        public async Task<int> GetTotalRatingsCountAsync(int? userId = null, EvaluationType? type = null)
        {
            var query = _context.Ratings.AsQueryable();

            if (userId.HasValue)
                query = query.Where(r => r.EvaluatedUserId == userId.Value);

            if (type.HasValue)
                query = query.Where(r => r.Type == type.Value);

            return await query.CountAsync();
        }

        public async Task<Dictionary<int, int>> GetScoreDistributionAsync(int? userId = null, EvaluationType? type = null)
        {
            var query = _context.Ratings
                .Where(r => r.Status == RatingStatus.Approved);

            if (userId.HasValue)
                query = query.Where(r => r.EvaluatedUserId == userId.Value);

            if (type.HasValue)
                query = query.Where(r => r.Type == type.Value);

            var scores = await query.Select(r => r.Score).ToListAsync();

            return scores
                .GroupBy(s => (int)Math.Ceiling(s))
                .ToDictionary(g => g.Key, g => g.Count());
        }

        public async Task<RatingStatsDto> GetRatingStatsAsync(int? userId = null, EvaluationType? type = null)
        {
            var query = _context.Ratings.AsQueryable();

            if (userId.HasValue)
                query = query.Where(r => r.EvaluatedUserId == userId.Value);

            if (type.HasValue)
                query = query.Where(r => r.Type == type.Value);

            var ratings = await query.ToListAsync();

            var stats = new RatingStatsDto
            {
                TotalRatings = ratings.Count,
                AverageScore = ratings.Any() ? ratings.Where(r => r.Status == RatingStatus.Approved).Average(r => r.Score) : 0,
                PendingRatings = ratings.Count(r => r.Status == RatingStatus.Submitted),
                ApprovedRatings = ratings.Count(r => r.Status == RatingStatus.Approved),
                DraftRatings = ratings.Count(r => r.Status == RatingStatus.Draft),
                ScoreDistribution = ratings
                    .Where(r => r.Status == RatingStatus.Approved)
                    .GroupBy(r => (int)Math.Ceiling(r.Score))
                    .ToDictionary(g => g.Key, g => g.Count())
            };

            // Statistiques par type
            var statsByType = ratings
                .GroupBy(r => r.Type)
                .ToDictionary(
                    g => g.Key.ToString(),
                    g => new RatingTypeStats
                    {
                        Count = g.Count(),
                        AverageScore = g.Where(r => r.Status == RatingStatus.Approved).Any() ?
                            g.Where(r => r.Status == RatingStatus.Approved).Average(r => r.Score) : 0,
                        LastRatingDate = g.Max(r => r.CreatedAt)
                    }
                );

            stats.StatsByType = statsByType;

            return stats;
        }

        #endregion

        #region Méthodes pour la gestion des statuts

        public async Task<IEnumerable<Rating>> GetPendingApprovalsAsync()
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Where(r => r.Status == RatingStatus.Submitted)
                .OrderBy(r => r.SubmittedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetDraftRatingsAsync(int userId)
        {
            return await _context.Ratings
                .Include(r => r.EvaluatedUser)
                .Where(r => r.EvaluatorId == userId && r.Status == RatingStatus.Draft)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetRatingsAwaitingResponseAsync(int userId)
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Where(r => r.EvaluatedUserId == userId &&
                           r.Status == RatingStatus.Approved &&
                           string.IsNullOrEmpty(r.Response))
                .OrderByDescending(r => r.ApprovedAt)
                .ToListAsync();
        }

        #endregion

        #region Méthodes pour les relations tuteur-stagiaire

        public async Task<IEnumerable<Rating>> GetTuteurRatingsForStagiaireAsync(int tuteurId, int stagiaireId)
        {
            return await _context.Ratings
                .Include(r => r.EvaluatedUser)
                .Where(r => r.EvaluatorId == tuteurId &&
                           r.EvaluatedUserId == stagiaireId &&
                           r.Type == EvaluationType.TuteurToStagiaire)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetStagiaireRatingsForTuteurAsync(int stagiaireId, int tuteurId)
        {
            return await _context.Ratings
                .Include(r => r.EvaluatedUser)
                .Where(r => r.EvaluatorId == stagiaireId &&
                           r.EvaluatedUserId == tuteurId &&
                           r.Type == EvaluationType.StagiaireToTuteur)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetAllRatingsForStagiaireAsync(int stagiaireId)
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Where(r => r.EvaluatedUserId == stagiaireId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetAllRatingsFromTuteurAsync(int tuteurId)
        {
            return await _context.Ratings
                .Include(r => r.EvaluatedUser)
                .Where(r => r.EvaluatorId == tuteurId && r.Type == EvaluationType.TuteurToStagiaire)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        #endregion

        #region Méthodes pour RH

        public async Task<IEnumerable<Rating>> GetRatingsRequiringRHApprovalAsync()
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Where(r => r.Status == RatingStatus.Submitted)
                .OrderBy(r => r.SubmittedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Rating>> GetRHRatingsForStagiaireAsync(int rhId, int stagiaireId)
        {
            return await _context.Ratings
                .Include(r => r.EvaluatedUser)
                .Where(r => r.EvaluatorId == rhId &&
                           r.EvaluatedUserId == stagiaireId &&
                           r.Type == EvaluationType.RHToStagiaire)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }
        public async Task<IEnumerable<Rating>> GetAllApprovedRatingsAsync()
        {
            return await _context.Ratings
                .Include(r => r.Evaluator)
                .Include(r => r.EvaluatedUser)
                .Include(r => r.ApprovedByUser)
                .Where(r => r.Status == RatingStatus.Approved)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }
        public async Task<List<int>> GetEvaluatedUserIdsByEvaluatorAsync(int evaluatorId, bool excludeRejected = true)
        {
            var query = _context.Ratings
                .Where(r => r.EvaluatorId == evaluatorId);

            if (excludeRejected)
            {
                query = query.Where(r => r.Status != RatingStatus.Rejected);
            }

            return await query
                .Select(r => r.EvaluatedUserId)
                .Distinct()
                .ToListAsync();
        }

        #endregion
    }
}