using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.domain.Entities;
using System.Security.Claims;

namespace PFE.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Nécessite une authentification
    public class RatingController : ControllerBase
    {
        private readonly IRatingService _ratingService;

        public RatingController(IRatingService ratingService)
        {
            _ratingService = ratingService;
        }

        // Méthode helper pour récupérer l'ID de l'utilisateur connecté
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out int userId) ? userId : 0;
        }

        #region CRUD Operations

        /// <summary>
        /// Créer une nouvelle évaluation
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<RatingDetailDto>> CreateRating([FromBody] CreateRatingDto createRatingDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.CreateRatingAsync(userId, createRatingDto);
                return CreatedAtAction(nameof(GetRatingById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Mettre à jour une évaluation
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<RatingDetailDto>> UpdateRating(int id, [FromBody] UpdateRatingDto updateRatingDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.UpdateRatingAsync(id, userId, updateRatingDto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer une évaluation par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<RatingDetailDto>> GetRatingById(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetRatingByIdAsync(id, userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Supprimer une évaluation
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteRating(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                Console.WriteLine($"🔍 Tentative de suppression - RatingId: {id}, UserId: {userId}");

                var result = await _ratingService.DeleteRatingAsync(id, userId);
                if (!result)
                {
                    Console.WriteLine($"❌ Évaluation {id} non trouvée");
                    return NotFound("Évaluation non trouvée");
                }

                Console.WriteLine($"✅ Évaluation {id} supprimée avec succès");
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                Console.WriteLine($"🚫 Accès refusé pour suppression {id}: {ex.Message}");
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"⚠️ Opération invalide pour suppression {id}: {ex.Message}");
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"💥 Erreur inattendue lors suppression {id}: {ex.Message}");
                Console.WriteLine($"📍 Stack trace: {ex.StackTrace}");
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Gestion des statuts

        /// <summary>
        /// Soumettre une évaluation pour approbation
        /// </summary>
        [HttpPost("{id}/submit")]
        public async Task<ActionResult<RatingDetailDto>> SubmitRating(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.SubmitRatingAsync(id, userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Approuver une évaluation (RH/Admin uniquement)
        /// </summary>
        [HttpPost("{id}/approve")]
        [Authorize(Roles = "Admin,RHs")]
        public async Task<ActionResult<RatingDetailDto>> ApproveRating(int id, [FromBody] ApproveRatingDto approveDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.ApproveRatingAsync(id, userId, approveDto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Rejeter une évaluation (RH/Admin uniquement)
        /// </summary>
        [HttpPost("{id}/reject")]
        [Authorize(Roles = "Admin,RHs")]
        public async Task<ActionResult<RatingDetailDto>> RejectRating(int id, [FromBody] string rejectionReason)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.RejectRatingAsync(id, userId, rejectionReason);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Réponses aux évaluations

        /// <summary>
        /// Ajouter une réponse à une évaluation
        /// </summary>
        [HttpPost("{id}/response")]
        public async Task<ActionResult<RatingDetailDto>> AddResponse(int id, [FromBody] RatingResponseDto responseDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.AddResponseToRatingAsync(id, userId, responseDto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Récupération de listes

        /// <summary>
        /// Récupérer les évaluations avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedRatingResultDto>> GetRatings([FromQuery] RatingFilterDto filters)
        {
            try
            {
                var result = await _ratingService.GetRatingsAsync(filters);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer mes évaluations (que j'ai créées)
        /// </summary>
        [HttpGet("my-ratings")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetMyRatings([FromQuery] EvaluationType? type = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetMyRatingsAsync(userId, type);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer les évaluations me concernant (dont je suis l'objet)
        /// </summary>
        [HttpGet("about-me")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetRatingsAboutMe()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetRatingsAboutMeAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer les évaluations en attente d'approbation (RH/Admin uniquement)
        /// </summary>
        [HttpGet("pending-approvals")]
        [Authorize(Roles = "Admin,RHs")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetPendingApprovals()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetPendingApprovalsAsync(userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer mes brouillons d'évaluations
        /// </summary>
        [HttpGet("drafts")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetDraftRatings()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetDraftRatingsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Méthodes spécifiques pour les tuteurs

        /// <summary>
        /// Récupérer les évaluations d'un tuteur (Tuteur uniquement)
        /// </summary>
        [HttpGet("tuteur/ratings")]
        [Authorize(Roles = "Tuteur")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetTuteurRatings()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetTuteurRatingsAsync(userId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Vérifier si un tuteur peut évaluer un stagiaire
        /// </summary>
        [HttpGet("tuteur/can-rate/{stagiaireId}")]
        [Authorize(Roles = "Tuteur")]
        public async Task<ActionResult<bool>> CanTuteurRateStagiaire(int stagiaireId)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.CanTuteurRateStagiaireAsync(userId, stagiaireId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Évaluer un stagiaire (Tuteur uniquement)
        /// </summary>
        [HttpPost("tuteur/rate-stagiaire/{stagiaireId}")]
        [Authorize(Roles = "Tuteur")]
        public async Task<ActionResult<RatingDetailDto>> RateStagiaire(int stagiaireId, [FromBody] CreateRatingDto ratingDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.RateStagiaireAsync(userId, stagiaireId, ratingDto);
                return CreatedAtAction(nameof(GetRatingById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Méthodes spécifiques pour les stagiaires

        /// <summary>
        /// Récupérer les évaluations d'un stagiaire (Stagiaire uniquement)
        /// </summary>
        [HttpGet("stagiaire/ratings")]
        [Authorize(Roles = "Stagiaire")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetStagiaireRatings()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetStagiaireRatingsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Vérifier si un stagiaire peut évaluer son tuteur
        /// </summary>
        [HttpGet("stagiaire/can-rate/{tuteurId}")]
        [Authorize(Roles = "Stagiaire")]
        public async Task<ActionResult<bool>> CanStagiaireRateTuteur(int tuteurId)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.CanStagiaireRateTuteurAsync(userId, tuteurId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Évaluer son tuteur (Stagiaire uniquement)
        /// </summary>
        [HttpPost("stagiaire/rate-tuteur/{tuteurId}")]
        [Authorize(Roles = "Stagiaire")]
        public async Task<ActionResult<RatingDetailDto>> RateTuteur(int tuteurId, [FromBody] CreateRatingDto ratingDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.RateTuteurAsync(userId, tuteurId, ratingDto);
                return CreatedAtAction(nameof(GetRatingById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Méthodes spécifiques pour RH

        /// <summary>
        /// Récupérer les évaluations d'un RH (RH uniquement)
        /// </summary>
        [HttpGet("rh/ratings")]
        [Authorize(Roles = "RHs")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetRHRatings()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetRHRatingsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Vérifier si un RH peut évaluer un stagiaire
        /// </summary>
        [HttpGet("rh/can-rate/{stagiaireId}")]
        [Authorize(Roles = "RHs")]
        public async Task<ActionResult<bool>> CanRHRateStagiaire(int stagiaireId)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.CanRHRateStagiaireAsync(userId, stagiaireId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Évaluer un stagiaire en tant que RH (RH uniquement)
        /// </summary>
        [HttpPost("rh/rate-stagiaire/{stagiaireId}")]
        [Authorize(Roles = "RHs")]
        public async Task<ActionResult<RatingDetailDto>> RateStagiaireAsRH(int stagiaireId, [FromBody] CreateRatingDto ratingDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.RateStagiaireAsRHAsync(userId, stagiaireId, ratingDto);
                return CreatedAtAction(nameof(GetRatingById), new { id = result.Id }, result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Statistiques

        /// <summary>
        /// Récupérer les statistiques d'évaluation d'un utilisateur
        /// </summary>
        [HttpGet("stats/user/{userId}")]
        public async Task<ActionResult<RatingStatsDto>> GetUserRatingStats(int userId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId == 0) return Unauthorized("Utilisateur non authentifié");

                // Vérifier que l'utilisateur peut voir ces statistiques (lui-même, RH ou Admin)
                var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                if (currentUserId != userId && currentUserRole != "Admin" && currentUserRole != "RHs")
                {
                    return Forbid("Vous n'êtes pas autorisé à voir ces statistiques");
                }

                var result = await _ratingService.GetUserRatingStatsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer mes statistiques d'évaluation
        /// </summary>
        [HttpGet("stats/me")]
        public async Task<ActionResult<RatingStatsDto>> GetMyRatingStats()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetUserRatingStatsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer les statistiques générales (Admin/RH uniquement)
        /// </summary>
        [HttpGet("stats/overall")]
        [Authorize(Roles = "Admin,RHs")]
        public async Task<ActionResult<RatingStatsDto>> GetOverallRatingStats()
        {
            try
            {
                var result = await _ratingService.GetOverallRatingStatsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer la moyenne d'évaluation d'un utilisateur
        /// </summary>
        [HttpGet("average/{userId}")]
        public async Task<ActionResult<double>> GetAverageRatingForUser(int userId, [FromQuery] EvaluationType? type = null)
        {
            try
            {
                var result = await _ratingService.GetAverageRatingForUserAsync(userId, type);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #region Vérifications et utilitaires

        /// <summary>
        /// Vérifier si un utilisateur a déjà évalué un autre utilisateur
        /// </summary>
        [HttpGet("check-existing/{evaluatedUserId}")]
        public async Task<ActionResult<bool>> HasUserAlreadyRated(int evaluatedUserId, [FromQuery] EvaluationType type)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.HasUserAlreadyRatedAsync(userId, evaluatedUserId, type);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Vérifier si un utilisateur peut évaluer un autre utilisateur
        /// </summary>
        [HttpGet("can-rate/{evaluatedUserId}")]
        public async Task<ActionResult<bool>> CanUserRate(int evaluatedUserId, [FromQuery] EvaluationType type)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.CanUserRateAsync(userId, evaluatedUserId, type);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer les utilisateurs que je peux évaluer
        /// </summary>
        [HttpGet("users-i-can-rate")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsersICanRate()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetUsersUserCanRateAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer les utilisateurs qui peuvent m'évaluer
        /// </summary>
        [HttpGet("users-who-can-rate-me")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsersWhoCanRateMe()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetUsersWhoCanRateUserAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }
        [HttpGet("users-i-can-rate-not-evaluated")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsersICanRateNotEvaluated()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Utilisateur non authentifié");

                var result = await _ratingService.GetUsersUserCanRateNotEvaluatedAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }
        

        #region Endpoints pour consulter les évaluations d'autres utilisateurs

        /// <summary>
        /// Récupérer les évaluations reçues par un utilisateur spécifique
        /// </summary>
        [HttpGet("user/{userId}/received")]
        public async Task<ActionResult<IEnumerable<RatingListDto>>> GetRatingsForUser(int userId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId == 0) return Unauthorized("Utilisateur non authentifié");

                // Vérifier les permissions via le service de rating qui a accès au UserRepository
                var canAccess = await _ratingService.CanViewUserRatingsAsync(currentUserId, userId);

                if (!canAccess)
                {
                    return Forbid("Vous n'êtes pas autorisé à voir les évaluations de cet utilisateur");
                }

                var result = await _ratingService.GetRatingsAboutUserAsync(userId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer la moyenne des évaluations d'un utilisateur
        /// </summary>
        [HttpGet("user/{userId}/average")]
        public async Task<ActionResult<double>> GetUserAverageRating(int userId, [FromQuery] EvaluationType? type = null)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId == 0) return Unauthorized("Utilisateur non authentifié");

                // Vérifier les permissions
                var canAccess = await _ratingService.CanViewUserRatingsAsync(currentUserId, userId);

                if (!canAccess)
                {
                    return Forbid("Vous n'êtes pas autorisé à voir les statistiques de cet utilisateur");
                }

                var result = await _ratingService.GetUserAverageRatingAsync(userId, type);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupérer les statistiques complètes d'un utilisateur
        /// </summary>
        [HttpGet("user/{userId}/stats")]
        public async Task<ActionResult<RatingStatsDto>> GetUserStats(int userId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                if (currentUserId == 0) return Unauthorized("Utilisateur non authentifié");

                // Vérifier les permissions
                var canAccess = await _ratingService.CanViewUserRatingsAsync(currentUserId, userId);

                if (!canAccess)
                {
                    return Forbid("Vous n'êtes pas autorisé à voir les statistiques de cet utilisateur");
                }

                var result = await _ratingService.GetDetailedUserStatsAsync(userId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne: {ex.Message}");
            }
        }

        #endregion

        #endregion
    }
}