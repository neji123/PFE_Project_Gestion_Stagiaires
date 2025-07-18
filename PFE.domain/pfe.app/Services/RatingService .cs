using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.application.Services;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

// Alias pour résoudre l'ambiguïté entre les classes DTOs et Entities
using DTOs = PFE.application.DTOs;

namespace PFE.application.Services
{
    public class RatingService : IRatingService
    {
        private readonly IRatingRepository _ratingRepository;
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public RatingService(
            IRatingRepository ratingRepository,
            IUserRepository userRepository,
            IEmailService emailService,
            INotificationService notificationService,
            IHubContext<NotificationHub> hubContext)
        {
            _ratingRepository = ratingRepository;
            _userRepository = userRepository;
            _emailService = emailService;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        #region CRUD de base

        public async Task<RatingDetailDto> CreateRatingAsync(int evaluatorId, CreateRatingDto createRatingDto)
        {
            // Vérifier les permissions
            if (!await ValidateRatingPermissionsAsync(evaluatorId, createRatingDto.EvaluatedUserId, createRatingDto.Type))
            {
                throw new UnauthorizedAccessException("Vous n'êtes pas autorisé à évaluer cet utilisateur.");
            }

            // Vérifier si une évaluation existe déjà
            if (await _ratingRepository.HasUserAlreadyRatedAsync(evaluatorId, createRatingDto.EvaluatedUserId, createRatingDto.Type,
                createRatingDto.EvaluationPeriodStart, createRatingDto.EvaluationPeriodEnd))
            {
                throw new InvalidOperationException("Vous avez déjà évalué cet utilisateur pour cette période.");
            }

            var rating = new Rating
            {
                EvaluatorId = evaluatorId,
                EvaluatedUserId = createRatingDto.EvaluatedUserId,
                Score = createRatingDto.Score,
                Comment = createRatingDto.Comment,
                Type = createRatingDto.Type,
                Status = RatingStatus.Draft,
                EvaluationPeriodStart = createRatingDto.EvaluationPeriodStart,
                EvaluationPeriodEnd = createRatingDto.EvaluationPeriodEnd,
                StageReference = createRatingDto.StageReference,
                CreatedAt = DateTime.UtcNow
            };

            // Sérialiser les critères détaillés - utiliser les DTOs explicitement
            if (createRatingDto.DetailedScores != null)
            {
                rating.DetailedScores = JsonSerializer.Serialize(createRatingDto.DetailedScores);
            }
            else if (createRatingDto.TutorScores != null)
            {
                rating.DetailedScores = JsonSerializer.Serialize(createRatingDto.TutorScores);
            }

            var savedRating = await _ratingRepository.AddAsync(rating);
            return await MapToDetailDto(savedRating);
        }

        public async Task<RatingDetailDto> UpdateRatingAsync(int ratingId, int userId, UpdateRatingDto updateRatingDto)
        {
            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null)
            {
                throw new ArgumentException("Évaluation non trouvée.");
            }

            if (!await IsRatingEditableAsync(ratingId, userId))
            {
                throw new InvalidOperationException("Vous ne pouvez pas modifier cette évaluation.");
            }

            // Mise à jour des propriétés
            if (updateRatingDto.Score.HasValue)
                rating.Score = updateRatingDto.Score.Value;

            if (!string.IsNullOrEmpty(updateRatingDto.Comment))
                rating.Comment = updateRatingDto.Comment;

            if (updateRatingDto.EvaluationPeriodStart.HasValue)
                rating.EvaluationPeriodStart = updateRatingDto.EvaluationPeriodStart;

            if (updateRatingDto.EvaluationPeriodEnd.HasValue)
                rating.EvaluationPeriodEnd = updateRatingDto.EvaluationPeriodEnd;

            if (!string.IsNullOrEmpty(updateRatingDto.StageReference))
                rating.StageReference = updateRatingDto.StageReference;

            // Mise à jour des critères détaillés - utiliser les DTOs explicitement
            if (updateRatingDto.DetailedScores != null)
            {
                rating.DetailedScores = JsonSerializer.Serialize(updateRatingDto.DetailedScores);
            }
            else if (updateRatingDto.TutorScores != null)
            {
                rating.DetailedScores = JsonSerializer.Serialize(updateRatingDto.TutorScores);
            }

            rating.UpdatedAt = DateTime.UtcNow;

            var updatedRating = await _ratingRepository.UpdateAsync(rating);
            return await MapToDetailDto(updatedRating);
        }

        public async Task<RatingDetailDto> GetRatingByIdAsync(int ratingId, int userId)
        {
            var rating = await _ratingRepository.GetByIdWithDetailsAsync(ratingId);
            if (rating == null)
            {
                throw new ArgumentException("Évaluation non trouvée.");
            }

            // Vérifier les permissions de lecture
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new ArgumentException("Utilisateur non trouvé.");
            }

            // Seuls l'évaluateur, l'évalué, les RH et les admins peuvent voir l'évaluation
            if (rating.EvaluatorId != userId &&
                rating.EvaluatedUserId != userId &&
                user.Role != UserRole.Admin &&
                user.Role != UserRole.RHs)
            {
                throw new UnauthorizedAccessException("Vous n'êtes pas autorisé à voir cette évaluation.");
            }

            return await MapToDetailDto(rating);
        }

        public async Task<bool> DeleteRatingAsync(int ratingId, int userId)
        {
            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null) return false;

            // ✅ CORRECTION : Permettre la suppression des brouillons ET des soumis
            // Seul l'évaluateur peut supprimer sa propre évaluation
            if (rating.EvaluatorId != userId)
            {
                throw new UnauthorizedAccessException("Vous ne pouvez pas supprimer cette évaluation.");
            }

            // ✅ Permettre la suppression seulement si Draft ou Submitted (pas Approved/Rejected)
            if (rating.Status != RatingStatus.Draft && rating.Status != RatingStatus.Submitted)
            {
                throw new InvalidOperationException("Vous ne pouvez supprimer que les évaluations en brouillon ou soumises.");
            }

            Console.WriteLine($"🗑️ Suppression de l'évaluation {ratingId} par l'utilisateur {userId}");
            Console.WriteLine($"📋 Statut de l'évaluation: {rating.Status}");

            return await _ratingRepository.DeleteAsync(ratingId);
        }

        #endregion

        #region Gestion des statuts

        public async Task<RatingDetailDto> SubmitRatingAsync(int ratingId, int userId)
        {
            Console.WriteLine($"🔍 DEBUG Submit - RatingId: {ratingId}, UserId: {userId}");

            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null)
            {
                Console.WriteLine("❌ Rating non trouvé");
                throw new ArgumentException("Évaluation non trouvée.");
            }

            Console.WriteLine($"🔍 DEBUG Rating trouvé - EvaluatorId: {rating.EvaluatorId}, Status: {rating.Status}");

            if (rating.EvaluatorId != userId)
            {
                Console.WriteLine($"❌ Mauvais utilisateur - Rating.EvaluatorId: {rating.EvaluatorId} != UserId: {userId}");
                throw new InvalidOperationException("Vous ne pouvez pas soumettre cette évaluation.");
            }

            if (rating.Status != RatingStatus.Draft)
            {
                Console.WriteLine($"❌ Mauvais statut - Status actuel: {rating.Status}");
                throw new InvalidOperationException("Cette évaluation a déjà été soumise.");
            }

            Console.WriteLine("✅ Toutes les vérifications OK, soumission en cours...");

            rating.Status = RatingStatus.Submitted;
            rating.SubmittedAt = DateTime.UtcNow;

            var updatedRating = await _ratingRepository.UpdateAsync(rating);

            // Envoyer notifications
            await SendRatingNotificationAsync(ratingId);

            return await MapToDetailDto(updatedRating);
        }

        public async Task<RatingDetailDto> ApproveRatingAsync(int ratingId, int approverId, ApproveRatingDto approveDto)
        {
            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null)
            {
                throw new ArgumentException("Évaluation non trouvée.");
            }

            var approver = await _userRepository.GetByIdAsync(approverId);
            if (approver == null || (approver.Role != UserRole.Admin && approver.Role != UserRole.RHs))
            {
                throw new UnauthorizedAccessException("Vous n'êtes pas autorisé à approuver des évaluations.");
            }

            if (rating.Status != RatingStatus.Submitted)
            {
                throw new InvalidOperationException("Cette évaluation ne peut pas être approuvée.");
            }

            rating.Status = RatingStatus.Approved;
            rating.ApprovedAt = DateTime.UtcNow;
            rating.ApprovedByUserId = approverId;

            var updatedRating = await _ratingRepository.UpdateAsync(rating);

            // Envoyer notifications
            await SendRatingApprovalNotificationAsync(ratingId);

            return await MapToDetailDto(updatedRating);
        }

        public async Task<RatingDetailDto> RejectRatingAsync(int ratingId, int approverId, string rejectionReason)
        {
            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null)
            {
                throw new ArgumentException("Évaluation non trouvée.");
            }

            var approver = await _userRepository.GetByIdAsync(approverId);
            if (approver == null || (approver.Role != UserRole.Admin && approver.Role != UserRole.RHs))
            {
                throw new UnauthorizedAccessException("Vous n'êtes pas autorisé à rejeter des évaluations.");
            }

            if (rating.Status != RatingStatus.Submitted)
            {
                throw new InvalidOperationException("Cette évaluation ne peut pas être rejetée.");
            }

            rating.Status = RatingStatus.Rejected;
            rating.ApprovedByUserId = approverId;
            rating.Comment += $"\n[REJETÉ par {approver.FirstName} {approver.LastName}: {rejectionReason}]";

            var updatedRating = await _ratingRepository.UpdateAsync(rating);

            // Envoyer notifications
            await SendRatingRejectionNotificationAsync(ratingId, rejectionReason);

            return await MapToDetailDto(updatedRating);
        }

        #endregion

        #region Réponses aux évaluations

        public async Task<RatingDetailDto> AddResponseToRatingAsync(int ratingId, int userId, RatingResponseDto responseDto)
        {
            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null)
            {
                throw new ArgumentException("Évaluation non trouvée.");
            }

            if (rating.EvaluatedUserId != userId)
            {
                throw new UnauthorizedAccessException("Vous ne pouvez répondre qu'à vos propres évaluations.");
            }

            if (rating.Status != RatingStatus.Approved)
            {
                throw new InvalidOperationException("Vous ne pouvez répondre qu'aux évaluations approuvées.");
            }

            rating.Response = responseDto.Response;
            rating.ResponseDate = DateTime.UtcNow;

            var updatedRating = await _ratingRepository.UpdateAsync(rating);
            return await MapToDetailDto(updatedRating);
        }

        #endregion

        #region Récupération de listes

        public async Task<PagedRatingResultDto> GetRatingsAsync(RatingFilterDto filters)
        {
            var (ratings, totalCount) = await _ratingRepository.GetRatingsWithFiltersAsync(filters);

            var ratingListDtos = ratings.Select(MapToListDto).ToList();

            return new PagedRatingResultDto
            {
                Ratings = ratingListDtos,
                TotalCount = totalCount,
                PageNumber = filters.PageNumber,
                PageSize = filters.PageSize
            };
        }

        public async Task<IEnumerable<RatingListDto>> GetMyRatingsAsync(int userId, EvaluationType? type = null)
        {
            var ratings = await _ratingRepository.GetRatingsByEvaluatorAsync(userId);

            if (type.HasValue)
            {
                ratings = ratings.Where(r => r.Type == type.Value);
            }

            return ratings.Select(MapToListDto);
        }

        public async Task<IEnumerable<RatingListDto>> GetRatingsAboutMeAsync(int userId)
        {
            var ratings = await _ratingRepository.GetRatingsByEvaluatedUserAsync(userId);
            return ratings.Select(MapToListDto);
        }

        public async Task<IEnumerable<RatingListDto>> GetPendingApprovalsAsync(int approverId)
        {
            var approver = await _userRepository.GetByIdAsync(approverId);
            if (approver == null || (approver.Role != UserRole.Admin && approver.Role != UserRole.RHs))
            {
                throw new UnauthorizedAccessException("Vous n'êtes pas autorisé à voir les approbations en attente.");
            }

            var ratings = await _ratingRepository.GetPendingApprovalsAsync();
            return ratings.Select(MapToListDto);
        }

        public async Task<IEnumerable<RatingListDto>> GetDraftRatingsAsync(int userId)
        {
            var ratings = await _ratingRepository.GetDraftRatingsAsync(userId);
            return ratings.Select(MapToListDto);
        }

        #endregion

        #region Méthodes spécifiques pour les tuteurs

        public async Task<IEnumerable<RatingListDto>> GetTuteurRatingsAsync(int tuteurId)
        {
            var tuteur = await _userRepository.GetByIdAsync(tuteurId);
            if (tuteur == null || tuteur.Role != UserRole.Tuteur)
            {
                throw new ArgumentException("Tuteur non trouvé.");
            }

            var ratings = await _ratingRepository.GetAllRatingsFromTuteurAsync(tuteurId);
            return ratings.Select(MapToListDto);
        }

        public async Task<IEnumerable<RatingListDto>> GetStagiairesRatedByTuteurAsync(int tuteurId)
        {
            var ratings = await _ratingRepository.GetAllRatingsFromTuteurAsync(tuteurId);
            return ratings.Select(MapToListDto);
        }

        public async Task<bool> CanTuteurRateStagiaireAsync(int tuteurId, int stagiaireId)
        {
            return await _ratingRepository.CanUserRateAsync(tuteurId, stagiaireId, EvaluationType.TuteurToStagiaire);
        }

        public async Task<RatingDetailDto> RateStagiaireAsync(int tuteurId, int stagiaireId, CreateRatingDto ratingDto)
        {
            ratingDto.EvaluatedUserId = stagiaireId;
            ratingDto.Type = EvaluationType.TuteurToStagiaire;

            return await CreateRatingAsync(tuteurId, ratingDto);
        }

        #endregion

        #region Méthodes spécifiques pour les stagiaires

        public async Task<IEnumerable<RatingListDto>> GetStagiaireRatingsAsync(int stagiaireId)
        {
            var ratings = await _ratingRepository.GetRatingsByEvaluatorAsync(stagiaireId);
            return ratings.Where(r => r.Type == EvaluationType.StagiaireToTuteur).Select(MapToListDto);
        }

        public async Task<bool> CanStagiaireRateTuteurAsync(int stagiaireId, int tuteurId)
        {
            return await _ratingRepository.CanUserRateAsync(stagiaireId, tuteurId, EvaluationType.StagiaireToTuteur);
        }

        public async Task<RatingDetailDto> RateTuteurAsync(int stagiaireId, int tuteurId, CreateRatingDto ratingDto)
        {
            ratingDto.EvaluatedUserId = tuteurId;
            ratingDto.Type = EvaluationType.StagiaireToTuteur;

            return await CreateRatingAsync(stagiaireId, ratingDto);
        }

        #endregion

        #region Méthodes spécifiques pour RH

        public async Task<IEnumerable<RatingListDto>> GetRHRatingsAsync(int rhId)
        {
            var ratings = await _ratingRepository.GetRatingsByEvaluatorAsync(rhId);
            return ratings.Where(r => r.Type == EvaluationType.RHToStagiaire).Select(MapToListDto);
        }

        public async Task<bool> CanRHRateStagiaireAsync(int rhId, int stagiaireId)
        {
            return await _ratingRepository.CanUserRateAsync(rhId, stagiaireId, EvaluationType.RHToStagiaire);
        }

        public async Task<RatingDetailDto> RateStagiaireAsRHAsync(int rhId, int stagiaireId, CreateRatingDto ratingDto)
        {
            ratingDto.EvaluatedUserId = stagiaireId;
            ratingDto.Type = EvaluationType.RHToStagiaire;

            return await CreateRatingAsync(rhId, ratingDto);
        }

        #endregion

        #region Statistiques

        public async Task<RatingStatsDto> GetUserRatingStatsAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new ArgumentException("Utilisateur non trouvé");

            // 🔧 Récupérer TOUTES les évaluations (pas de filtre d'approbation)
            var myRatings = await _ratingRepository.GetRatingsByEvaluatorAsync(userId);
            var ratingsAboutMe = await _ratingRepository.GetRatingsByEvaluatedUserAsync(userId);

            // 🔧 Moyennes - seulement les ratings SOUMIS (pas les brouillons)
            double averageScoreGiven = 0;  // Notes données
            double averageScoreReceived = 0;  // Notes reçues

            // Moyenne des notes DONNÉES (évaluations que j'ai créées et soumises)
            var submittedRatingsGiven = myRatings.Where(r => r.Status == RatingStatus.Submitted);
            if (submittedRatingsGiven.Any())
            {
                averageScoreGiven = submittedRatingsGiven.Average(r => r.Score);
            }

            // Moyenne des notes REÇUES (évaluations me concernant et soumises)
            var submittedRatingsReceived = ratingsAboutMe.Where(r => r.Status == RatingStatus.Submitted);
            if (submittedRatingsReceived.Any())
            {
                averageScoreReceived = submittedRatingsReceived.Average(r => r.Score);
            }

            // 🔧 Calculs simples
            var totalRatings = submittedRatingsGiven.Count() + submittedRatingsReceived.Count();
            var draftRatings = myRatings.Count(r => r.Status == RatingStatus.Draft);

            // 🔧 Statistiques spéciales selon le rôle
            var specialStats = new Dictionary<string, object>();

            if (user.Role == UserRole.Tuteur)
            {
                // Pour les tuteurs : trouver le meilleur stagiaire évalué
                var bestStagiaire = submittedRatingsGiven
                    .Where(r => r.EvaluatedUser?.Role == UserRole.Stagiaire)
                    .OrderByDescending(r => r.Score)
                    .FirstOrDefault();

                if (bestStagiaire != null)
                {
                    specialStats["bestStagiaire"] = new
                    {
                        Name = $"{bestStagiaire.EvaluatedUser.FirstName} {bestStagiaire.EvaluatedUser.LastName}",
                        Score = bestStagiaire.Score,
                        EvaluationDate = bestStagiaire.CreatedAt
                    };
                }
            }
            else if (user.Role == UserRole.RHs)
            {
                // Pour les RH : Top 5 basé sur toutes les évaluations soumises
                var allSubmittedRatings = await GetAllSubmittedRatingsAsync();

                // Top 5 tuteurs les mieux notés
                var topTutors = allSubmittedRatings
                    .Where(r => r.EvaluatedUser?.Role == UserRole.Tuteur)
                    .GroupBy(r => r.EvaluatedUserId)
                    .Select(g => new
                    {
                        UserId = g.Key,
                        Name = $"{g.First().EvaluatedUser.FirstName} {g.First().EvaluatedUser.LastName}",
                        AverageScore = g.Average(x => x.Score),
                        EvaluationCount = g.Count()
                    })
                    .OrderByDescending(x => x.AverageScore)
                    .Take(5)
                    .ToList();

                // Top 5 stagiaires les mieux notés
                var topStagiaires = allSubmittedRatings
                    .Where(r => r.EvaluatedUser?.Role == UserRole.Stagiaire)
                    .GroupBy(r => r.EvaluatedUserId)
                    .Select(g => new
                    {
                        UserId = g.Key,
                        Name = $"{g.First().EvaluatedUser.FirstName} {g.First().EvaluatedUser.LastName}",
                        AverageScore = g.Average(x => x.Score),
                        EvaluationCount = g.Count()
                    })
                    .OrderByDescending(x => x.AverageScore)
                    .Take(5)
                    .ToList();

                specialStats["topTutors"] = topTutors;
                specialStats["topStagiaires"] = topStagiaires;
            }

            return new RatingStatsDto
            {
                TotalRatings = totalRatings,
                AverageScore = Math.Round(averageScoreReceived, 2),
                AverageScoreGiven = Math.Round(averageScoreGiven, 2),
                ApprovedRatings = 0,     // 🔧 PLUS UTILISÉ
                PendingRatings = 0,      // 🔧 PLUS UTILISÉ  
                DraftRatings = draftRatings, // 🔧 GARDÉ : utile pour savoir ce qui est en cours
                ScoreDistribution = new Dictionary<int, int>(),
                StatsByType = new Dictionary<string, RatingTypeStats>(),
                SpecialStats = specialStats
            };
        }

        // 🔧 NOUVELLE MÉTHODE : ratings soumis (pas approuvés)
        private async Task<IEnumerable<Rating>> GetAllSubmittedRatingsAsync()
        {
            return await _ratingRepository.GetRatingsByStatusAsync(RatingStatus.Submitted);
        }

        // 🔧 NOUVELLE MÉTHODE HELPER dans le service
        private async Task<IEnumerable<Rating>> GetAllApprovedRatingsAsync()
        {
            return await _ratingRepository.GetAllApprovedRatingsAsync();
        }

        public async Task<RatingStatsDto> GetOverallRatingStatsAsync()
        {
            return await _ratingRepository.GetRatingStatsAsync();
        }

        public async Task<double> GetAverageRatingForUserAsync(int userId, EvaluationType? type = null)
        {
            return await _ratingRepository.GetAverageRatingForUserAsync(userId, type);
        }

        #endregion

        #region Vérifications de business rules

        public async Task<bool> HasUserAlreadyRatedAsync(int evaluatorId, int evaluatedUserId, EvaluationType type)
        {
            return await _ratingRepository.HasUserAlreadyRatedAsync(evaluatorId, evaluatedUserId, type);
        }

        public async Task<bool> CanUserRateAsync(int evaluatorId, int evaluatedUserId, EvaluationType type)
        {
            return await _ratingRepository.CanUserRateAsync(evaluatorId, evaluatedUserId, type);
        }

        public async Task<IEnumerable<User>> GetUsersUserCanRateAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return new List<User>();

            return user.Role switch
            {
                UserRole.Tuteur => await _userRepository.GetStagiairesByTuteurAsync(userId),
                UserRole.Stagiaire => user.TuteurId.HasValue ?
                    new List<User> { await _userRepository.GetByIdAsync(user.TuteurId.Value) }.Where(u => u != null) :
                    new List<User>(),
                UserRole.RHs => await _userRepository.GetUsersByRoleAsync(UserRole.Stagiaire),
                _ => new List<User>()
            };
        }

        public async Task<IEnumerable<User>> GetUsersWhoCanRateUserAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return new List<User>();

            var users = new List<User>();

            if (user.Role == UserRole.Stagiaire)
            {
                // Les tuteurs et RH peuvent évaluer les stagiaires
                if (user.TuteurId.HasValue)
                {
                    var tuteur = await _userRepository.GetByIdAsync(user.TuteurId.Value);
                    if (tuteur != null) users.Add(tuteur);
                }

                var rhUsers = await _userRepository.GetUsersByRoleAsync(UserRole.RHs);
                users.AddRange(rhUsers);
            }
            else if (user.Role == UserRole.Tuteur)
            {
                // Les stagiaires peuvent évaluer leur tuteur
                var stagiaires = await _userRepository.GetStagiairesByTuteurAsync(userId);
                users.AddRange(stagiaires);
            }

            return users;
        }

        #endregion

        #region Notifications et emails

        public async Task SendRatingNotificationAsync(int ratingId)
        {
            var rating = await _ratingRepository.GetByIdWithDetailsAsync(ratingId);
            if (rating == null) return;

            try
            {
                var notification = new CreateNotificationDto
                {
                    Title = "Nouvelle évaluation",
                    Message = $"Vous avez reçu une nouvelle évaluation de {rating.Evaluator.FirstName} {rating.Evaluator.LastName}",
                    Type = NotificationType.RatingReceived,
                    UserId = rating.EvaluatedUserId,
                    RelatedEntityId = ratingId.ToString()
                };

                await _notificationService.CreateNotificationAsync(notification);

                // Email optionnel
                if (_emailService != null)
                {
                    await _emailService.SendEmailAsync(
                        rating.EvaluatedUser.Email,
                        "Nouvelle évaluation reçue",
                        $"Vous avez reçu une nouvelle évaluation. Connectez-vous pour la consulter."
                    );
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de l'envoi de notification pour l'évaluation {ratingId}: {ex.Message}");
            }
        }

        public async Task SendRatingApprovalNotificationAsync(int ratingId)
        {
            var rating = await _ratingRepository.GetByIdWithDetailsAsync(ratingId);
            if (rating == null) return;

            try
            {
                // Notifier l'évaluateur
                var notificationEvaluator = new CreateNotificationDto
                {
                    Title = "Évaluation approuvée",
                    Message = "Votre évaluation a été approuvée",
                    Type = NotificationType.RatingApproved,
                    UserId = rating.EvaluatorId,
                    RelatedEntityId = ratingId.ToString()
                };
                await _notificationService.CreateNotificationAsync(notificationEvaluator);

                // Notifier l'évalué
                var notificationEvaluated = new CreateNotificationDto
                {
                    Title = "Évaluation approuvée",
                    Message = "Une évaluation vous concernant a été approuvée",
                    Type = NotificationType.RatingApproved,
                    UserId = rating.EvaluatedUserId,
                    RelatedEntityId = ratingId.ToString()
                };
                await _notificationService.CreateNotificationAsync(notificationEvaluated);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de l'envoi de notification d'approbation pour l'évaluation {ratingId}: {ex.Message}");
            }
        }

        public async Task SendRatingRejectionNotificationAsync(int ratingId, string reason)
        {
            var rating = await _ratingRepository.GetByIdWithDetailsAsync(ratingId);
            if (rating == null) return;

            try
            {
                var notification = new CreateNotificationDto
                {
                    Title = "Évaluation rejetée",
                    Message = $"Votre évaluation a été rejetée. Raison: {reason}",
                    Type = NotificationType.RatingRejected,
                    UserId = rating.EvaluatorId,
                    RelatedEntityId = ratingId.ToString()
                };
                await _notificationService.CreateNotificationAsync(notification);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de l'envoi de notification de rejet pour l'évaluation {ratingId}: {ex.Message}");
            }
        }

        #endregion

        #region Validation

        public async Task<bool> ValidateRatingPermissionsAsync(int evaluatorId, int evaluatedUserId, EvaluationType type)
        {
            return await _ratingRepository.CanUserRateAsync(evaluatorId, evaluatedUserId, type);
        }

        public async Task<bool> IsRatingEditableAsync(int ratingId, int userId)
        {
            var rating = await _ratingRepository.GetByIdAsync(ratingId);
            if (rating == null) return false;

            // 🔧 VÉRIFICATION SIMPLE : 
            // Seul l'évaluateur peut modifier ET le rating doit être Draft ou Submitted
            return rating.EvaluatorId == userId &&
                   (rating.Status == RatingStatus.Draft || rating.Status == RatingStatus.Submitted);
        }

        #endregion

        #region Méthodes d'aide pour le mapping

        private async Task<RatingDetailDto> MapToDetailDto(Rating rating)
        {
            if (rating.Evaluator == null)
                rating = await _ratingRepository.GetByIdWithDetailsAsync(rating.Id);

            var dto = new RatingDetailDto
            {
                Id = rating.Id,
                EvaluatorId = rating.EvaluatorId,
                EvaluatorName = $"{rating.Evaluator?.FirstName} {rating.Evaluator?.LastName}",
                EvaluatorRole = rating.Evaluator?.Role.ToString(),
                EvaluatorProfilePicture = rating.Evaluator?.ProfilePictureUrl,
                EvaluatedUserId = rating.EvaluatedUserId,
                EvaluatedUserName = $"{rating.EvaluatedUser?.FirstName} {rating.EvaluatedUser?.LastName}",
                EvaluatedUserRole = rating.EvaluatedUser?.Role.ToString(),
                EvaluatedUserProfilePicture = rating.EvaluatedUser?.ProfilePictureUrl,
                Score = rating.Score,
                Comment = rating.Comment,
                Type = rating.Type,
                Status = rating.Status,
                CreatedAt = rating.CreatedAt,
                UpdatedAt = rating.UpdatedAt,
                SubmittedAt = rating.SubmittedAt,
                ApprovedAt = rating.ApprovedAt,
                ApprovedByUserId = rating.ApprovedByUserId,
                ApprovedByUserName = rating.ApprovedByUser != null ? $"{rating.ApprovedByUser.FirstName} {rating.ApprovedByUser.LastName}" : null,
                Response = rating.Response,
                ResponseDate = rating.ResponseDate,
                EvaluationPeriodStart = rating.EvaluationPeriodStart,
                EvaluationPeriodEnd = rating.EvaluationPeriodEnd,
                StageReference = rating.StageReference
            };

            // 🔧 CORRECTION : Désérialisation améliorée des critères détaillés
            if (!string.IsNullOrEmpty(rating.DetailedScores))
            {
                try
                {
                    // Log pour debug
                    Console.WriteLine($"🔍 Désérialisation des critères pour évaluation {rating.Id}");
                    Console.WriteLine($"📄 JSON brut: {rating.DetailedScores}");
                    Console.WriteLine($"🎯 Type d'évaluation: {rating.Type}");

                    if (rating.Type == EvaluationType.StagiaireToTuteur)
                    {
                        // Désérialiser comme critères tuteur
                        var tutorScores = JsonSerializer.Deserialize<DTOs.TutorEvaluationCriteria>(
                            rating.DetailedScores,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                        );
                        dto.TutorScores = tutorScores;
                        Console.WriteLine($"✅ Critères tuteur désérialisés: {JsonSerializer.Serialize(tutorScores)}");
                    }
                    else
                    {
                        // Désérialiser comme critères détaillés standard
                        var detailedScores = JsonSerializer.Deserialize<DTOs.DetailedEvaluationCriteria>(
                            rating.DetailedScores,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                        );
                        dto.DetailedScores = detailedScores;
                        Console.WriteLine($"✅ Critères détaillés désérialisés: {JsonSerializer.Serialize(detailedScores)}");
                    }
                }
                catch (JsonException ex)
                {
                    Console.WriteLine($"❌ Erreur lors de la désérialisation des critères détaillés pour l'évaluation {rating.Id}: {ex.Message}");
                    Console.WriteLine($"📄 JSON problématique: {rating.DetailedScores}");

                    // En cas d'erreur, créer des critères par défaut
                    if (rating.Type == EvaluationType.StagiaireToTuteur)
                    {
                        dto.TutorScores = new DTOs.TutorEvaluationCriteria
                        {
                            Availability = rating.Score,
                            Guidance = rating.Score,
                            Communication = rating.Score,
                            Expertise = rating.Score,
                            Support = rating.Score,
                            Feedback = rating.Score,
                            OverallSatisfaction = rating.Score
                        };
                    }
                    else
                    {
                        dto.DetailedScores = new DTOs.DetailedEvaluationCriteria
                        {
                            TechnicalSkills = rating.Score,
                            Communication = rating.Score,
                            Teamwork = rating.Score,
                            Initiative = rating.Score,
                            Punctuality = rating.Score,
                            ProblemSolving = rating.Score,
                            Adaptability = rating.Score,
                            OverallPerformance = rating.Score
                        };
                    }
                }
            }
            else
            {
                Console.WriteLine($"⚠️ Aucun critère détaillé trouvé pour l'évaluation {rating.Id}");

                // Créer des critères basés sur le score général si pas de détails
                if (rating.Type == EvaluationType.StagiaireToTuteur)
                {
                    dto.TutorScores = new DTOs.TutorEvaluationCriteria
                    {
                        Availability = rating.Score,
                        Guidance = rating.Score,
                        Communication = rating.Score,
                        Expertise = rating.Score,
                        Support = rating.Score,
                        Feedback = rating.Score,
                        OverallSatisfaction = rating.Score
                    };
                }
                else
                {
                    dto.DetailedScores = new DTOs.DetailedEvaluationCriteria
                    {
                        TechnicalSkills = rating.Score,
                        Communication = rating.Score,
                        Teamwork = rating.Score,
                        Initiative = rating.Score,
                        Punctuality = rating.Score,
                        ProblemSolving = rating.Score,
                        Adaptability = rating.Score,
                        OverallPerformance = rating.Score
                    };
                }
            }

            return dto;
        }

        private RatingListDto MapToListDto(Rating rating)
        {
            return new RatingListDto
            {
                Id = rating.Id,
                EvaluatorName = $"{rating.Evaluator?.FirstName} {rating.Evaluator?.LastName}",
                EvaluatedUserId = rating.EvaluatedUserId,
                EvaluatedUserName = $"{rating.EvaluatedUser?.FirstName} {rating.EvaluatedUser?.LastName}",
                Score = rating.Score,
                Type = rating.Type,
                Status = rating.Status,
                CreatedAt = rating.CreatedAt,
                SubmittedAt = rating.SubmittedAt,
                StageReference = rating.StageReference
            };
        }
        public async Task<IEnumerable<User>> GetUsersUserCanRateNotEvaluatedAsync(int userId)
        {
            try
            {
                // 1️⃣ Récupérer tous les utilisateurs que je peux évaluer
                var usersICanRate = await GetUsersUserCanRateAsync(userId);

                // 2️⃣ Récupérer mes évaluations (incluant tous les statuts sauf Rejected)
                var myRatings = await _ratingRepository.GetRatingsByEvaluatorAsync(userId);

                // 3️⃣ Extraire les IDs des utilisateurs déjà évalués
                var alreadyEvaluatedUserIds = myRatings
                    .Where(r => r.Status != RatingStatus.Rejected) // Exclure les rejetés
                    .Select(r => r.EvaluatedUserId)
                    .Distinct()
                    .ToHashSet();

                // 4️⃣ Filtrer les utilisateurs non encore évalués
                var usersNotEvaluated = usersICanRate
                    .Where(user => !alreadyEvaluatedUserIds.Contains(user.Id))
                    .OrderBy(u => u.LastName)
                    .ThenBy(u => u.FirstName)
                    .ToList();

                Console.WriteLine($"👥 Utilisateur {userId} - Filtrage intelligent:");
                Console.WriteLine($"- Utilisateurs évaluables: {usersICanRate.Count()}");
                Console.WriteLine($"- Déjà évalués: {alreadyEvaluatedUserIds.Count}");
                Console.WriteLine($"- Non encore évalués: {usersNotEvaluated.Count}");

                return usersNotEvaluated;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur dans GetUsersUserCanRateNotEvaluatedAsync: {ex.Message}");
                // En cas d'erreur, retourner la liste complète
                return await GetUsersUserCanRateAsync(userId);
            }
        }

        #endregion
        /// <summary>
        /// Récupérer toutes les évaluations reçues par un utilisateur spécifique
        /// </summary>
        public async Task<IEnumerable<RatingListDto>> GetRatingsAboutUserAsync(int userId)
        {
            Console.WriteLine($"🔍 Récupération des évaluations pour l'utilisateur {userId}");

            try
            {
                // Récupérer toutes les évaluations où l'utilisateur est l'évalué
                var ratings = await _ratingRepository.GetRatingsByEvaluatedUserAsync(userId);

                // Filtrer pour ne garder que les évaluations soumises (pas les brouillons)
                var submittedRatings = ratings.Where(r => r.Status == RatingStatus.Submitted ||
                                                          r.Status == RatingStatus.Approved);

                var result = submittedRatings.Select(MapToListDto).ToList();

                Console.WriteLine($"✅ {result.Count} évaluations trouvées pour l'utilisateur {userId}");

                // Log détaillé pour debug
                foreach (var rating in result)
                {
                    Console.WriteLine($"📋 Évaluation: ID={rating.Id}, Score={rating.Score}, " +
                                    $"Par={rating.EvaluatorName}, Type={rating.Type}, Status={rating.Status}");
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur lors de la récupération des évaluations pour l'utilisateur {userId}: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Récupérer la moyenne des évaluations reçues par un utilisateur (méthode améliorée)
        /// </summary>
        public async Task<double> GetUserAverageRatingAsync(int userId, EvaluationType? type = null)
        {
            try
            {
                var ratings = await _ratingRepository.GetRatingsByEvaluatedUserAsync(userId);

                // Filtrer par type si spécifié
                if (type.HasValue)
                {
                    ratings = ratings.Where(r => r.Type == type.Value);
                }

                // Ne prendre que les évaluations soumises/approuvées
                var validRatings = ratings.Where(r => r.Status == RatingStatus.Submitted ||
                                                       r.Status == RatingStatus.Approved);

                if (!validRatings.Any())
                {
                    Console.WriteLine($"⚠️ Aucune évaluation valide trouvée pour l'utilisateur {userId}");
                    return 0;
                }

                var average = validRatings.Average(r => r.Score);
                Console.WriteLine($"📊 Moyenne calculée pour l'utilisateur {userId}: {average:F2} " +
                                 $"(basée sur {validRatings.Count()} évaluations)");

                return Math.Round(average, 2);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur lors du calcul de la moyenne pour l'utilisateur {userId}: {ex.Message}");
                return 0;
            }
        }

        /// <summary>
        /// Récupérer des statistiques détaillées pour un utilisateur spécifique
        /// </summary>
        public async Task<RatingStatsDto> GetDetailedUserStatsAsync(int userId)
        {
            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                    throw new ArgumentException("Utilisateur non trouvé");

                // Évaluations REÇUES par cet utilisateur
                var ratingsReceived = await _ratingRepository.GetRatingsByEvaluatedUserAsync(userId);
                var validRatingsReceived = ratingsReceived.Where(r => r.Status == RatingStatus.Submitted ||
                                                                      r.Status == RatingStatus.Approved);

                // Évaluations DONNÉES par cet utilisateur
                var ratingsGiven = await _ratingRepository.GetRatingsByEvaluatorAsync(userId);
                var validRatingsGiven = ratingsGiven.Where(r => r.Status == RatingStatus.Submitted ||
                                                                r.Status == RatingStatus.Approved);

                // Calculs
                var averageReceived = validRatingsReceived.Any() ?
                    validRatingsReceived.Average(r => r.Score) : 0;
                var averageGiven = validRatingsGiven.Any() ?
                    validRatingsGiven.Average(r => r.Score) : 0;

                // Distribution des scores reçus
                var scoreDistribution = validRatingsReceived
                    .GroupBy(r => (int)Math.Ceiling(r.Score))
                    .ToDictionary(g => g.Key, g => g.Count());

                // Statistiques par type d'évaluation
                var statsByType = validRatingsReceived
                    .GroupBy(r => r.Type)
                    .ToDictionary(
                        g => g.Key.ToString(),
                        g => new RatingTypeStats
                        {
                            Count = g.Count(),
                            AverageScore = g.Average(r => r.Score),
                            LastRatingDate = g.Max(r => r.CreatedAt)
                        }
                    );

                return new RatingStatsDto
                {
                    TotalRatings = validRatingsReceived.Count(),
                    AverageScore = Math.Round(averageReceived, 2),
                    AverageScoreGiven = Math.Round(averageGiven, 2),
                    ApprovedRatings = ratingsReceived.Count(r => r.Status == RatingStatus.Approved),
                    PendingRatings = ratingsReceived.Count(r => r.Status == RatingStatus.Submitted),
                    DraftRatings = ratingsGiven.Count(r => r.Status == RatingStatus.Draft),
                    ScoreDistribution = scoreDistribution,
                    StatsByType = statsByType,
                    SpecialStats = new Dictionary<string, object>()
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur lors du calcul des stats détaillées pour l'utilisateur {userId}: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Vérifier si un utilisateur peut voir les évaluations d'un autre utilisateur
        /// </summary>
        public async Task<bool> CanViewUserRatingsAsync(int currentUserId, int targetUserId)
        {
            try
            {
                // L'utilisateur peut toujours voir ses propres évaluations
                if (currentUserId == targetUserId)
                {
                    return true;
                }

                // Récupérer l'utilisateur actuel
                var currentUser = await _userRepository.GetByIdAsync(currentUserId);
                if (currentUser == null)
                {
                    return false;
                }

                // Les RH et Admins peuvent voir toutes les évaluations
                if (currentUser.Role == UserRole.Admin || currentUser.Role == UserRole.RHs)
                {
                    return true;
                }

                // Si c'est un tuteur, vérifier qu'il peut voir son stagiaire
                if (currentUser.Role == UserRole.Tuteur)
                {
                    var targetUser = await _userRepository.GetByIdAsync(targetUserId);
                    if (targetUser != null && targetUser.Role == UserRole.Stagiaire && targetUser.TuteurId == currentUserId)
                    {
                        return true;
                    }
                }

                // Si c'est un stagiaire, il peut voir son tuteur
                if (currentUser.Role == UserRole.Stagiaire)
                {
                    var targetUser = await _userRepository.GetByIdAsync(targetUserId);
                    if (targetUser != null && targetUser.Role == UserRole.Tuteur && currentUser.TuteurId == targetUserId)
                    {
                        return true;
                    }
                }

                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Erreur lors de la vérification des permissions: {ex.Message}");
                return false;
            }
        }

    }
}