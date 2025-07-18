using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.Application.DTOs;
using PFE.application.Interfaces;
using PFE.application.DTOs;
using PFE.Application.Interfaces;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize] // Nécessite une authentification
    public class MeetingsController : ControllerBase
    {
        private readonly IMeetingService _meetingService;
        private readonly ILogger<MeetingsController> _logger;
        private readonly IUserService _userService;

        public MeetingsController(IMeetingService meetingService, IUserService userService, ILogger<MeetingsController> logger)
        {
            _meetingService = meetingService;
            _userService = userService;
            _logger = logger;
        }

        // GET: api/meetings
        [HttpGet]
        public async Task<IActionResult> GetAllMeetings([FromQuery] MeetingFilterDto? filter = null)
        {
            try
            {
                IEnumerable<MeetingDto> meetings;

                if (filter != null && (filter.Type != null || filter.Status != null ||
                                     filter.StartDate != null || filter.EndDate != null ||
                                     filter.UserId != null || filter.OrganizerId != null))
                {
                    meetings = await _meetingService.GetMeetingsByFilterAsync(filter);
                }
                else
                {
                    meetings = await _meetingService.GetAllMeetingsAsync();
                }

                return Ok(meetings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des meetings");
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        // GET: api/meetings/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetMeetingById(int id)
        {
            try
            {
                var meeting = await _meetingService.GetMeetingByIdAsync(id);
                if (meeting == null)
                {
                    return NotFound(new { message = "Meeting non trouvé" });
                }

                return Ok(meeting);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération du meeting {MeetingId}", id);
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        // GET: api/meetings/user/{userId}
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetMeetingsByUser(int userId)
        {
            try
            {
                var meetings = await _meetingService.GetMeetingsByUserAsync(userId);
                return Ok(meetings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des meetings pour l'utilisateur {UserId}", userId);
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        // POST: api/meetings
        [HttpPost]
        public async Task<IActionResult> CreateMeeting([FromBody] CreateMeetingDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Vérifier les disponibilités des participants
                var conflicts = await CheckParticipantsAvailability(createDto);
                if (conflicts.Any())
                {
                    return BadRequest(new
                    {
                        message = "Conflit d'horaire détecté",
                        conflicts = conflicts
                    });
                }

                var meeting = await _meetingService.CreateMeetingAsync(createDto);

                // Log pour confirmer la création et l'envoi d'emails
                _logger.LogInformation("Meeting {MeetingId} créé avec succès. Emails de notification envoyés aux participants.", meeting.Id);

                return CreatedAtAction(nameof(GetMeetingById), new { id = meeting.Id }, meeting);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la création du meeting");
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        // PUT: api/meetings/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMeeting(int id, [FromBody] UpdateMeetingDto updateDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Vérifier les disponibilités si la date/heure change
                if (updateDto.Date != null || updateDto.Time != null || updateDto.Duration != null)
                {
                    var conflicts = await CheckParticipantsAvailabilityForUpdate(id, updateDto);
                    if (conflicts.Any())
                    {
                        return BadRequest(new
                        {
                            message = "Conflit d'horaire détecté",
                            conflicts = conflicts
                        });
                    }
                }

                var meeting = await _meetingService.UpdateMeetingAsync(id, updateDto);

                // Log pour confirmer la mise à jour et l'envoi d'emails si nécessaire
                _logger.LogInformation("Meeting {MeetingId} mis à jour avec succès. Emails de notification envoyés si nécessaire.", meeting.Id);

                return Ok(meeting);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Meeting non trouvé" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la mise à jour du meeting {MeetingId}", id);
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        // DELETE: api/meetings/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMeeting(int id)
        {
            try
            {
                await _meetingService.DeleteMeetingAsync(id);

                // Log pour confirmer la suppression et l'envoi d'emails d'annulation
                _logger.LogInformation("Meeting {MeetingId} supprimé avec succès. Emails d'annulation envoyés aux participants.", id);

                return Ok(new { message = "Meeting supprimé avec succès" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Meeting non trouvé" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la suppression du meeting {MeetingId}", id);
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        // POST: api/meetings/check-availability
        [HttpPost("check-availability")]
        public async Task<IActionResult> CheckAvailability([FromBody] AvailabilityCheckDto checkDto)
        {
            try
            {
                var date = DateTime.ParseExact(checkDto.Date, "yyyy-MM-dd", null);
                var time = TimeSpan.Parse(checkDto.Time);

                var isAvailable = await _meetingService.CheckAvailabilityAsync(
                    checkDto.UserId,
                    date,
                    time,
                    checkDto.Duration,
                    checkDto.ExcludeMeetingId
                );

                return Ok(new { isAvailable });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la vérification de disponibilité");
                return StatusCode(500, new { message = "Erreur interne du serveur" });
            }
        }

        private async Task<List<string>> CheckParticipantsAvailability(CreateMeetingDto createDto)
        {
            var conflicts = new List<string>();
            var date = DateTime.ParseExact(createDto.Date, "yyyy-MM-dd", null);
            var time = TimeSpan.Parse(createDto.Time);

            foreach (var participantId in createDto.ParticipantIds)
            {
                var isAvailable = await _meetingService.CheckAvailabilityAsync(
                    participantId, date, time, createDto.Duration);

                if (!isAvailable)
                {
                    // Récupérer le nom de l'utilisateur pour un message plus clair
                    try
                    {
                        var user = await _userService.GetUserByIdAsync(participantId);
                        conflicts.Add($"{user.FirstName} {user.LastName} n'est pas disponible à cette heure");
                    }
                    catch
                    {
                        conflicts.Add($"L'utilisateur {participantId} n'est pas disponible à cette heure");
                    }
                }
            }

            return conflicts;
        }

        private async Task<List<string>> CheckParticipantsAvailabilityForUpdate(int meetingId, UpdateMeetingDto updateDto)
        {
            var conflicts = new List<string>();

            if (updateDto.Date == null || updateDto.Time == null || updateDto.Duration == null)
            {
                return conflicts; // Pas de changement d'horaire
            }

            var date = DateTime.ParseExact(updateDto.Date, "yyyy-MM-dd", null);
            var time = TimeSpan.Parse(updateDto.Time);

            if (updateDto.ParticipantIds != null)
            {
                foreach (var participantId in updateDto.ParticipantIds)
                {
                    var isAvailable = await _meetingService.CheckAvailabilityAsync(
                        participantId, date, time, updateDto.Duration.Value, meetingId);

                    if (!isAvailable)
                    {
                        try
                        {
                            var user = await _userService.GetUserByIdAsync(participantId);
                            conflicts.Add($"{user.FirstName} {user.LastName} n'est pas disponible à cette heure");
                        }
                        catch
                        {
                            conflicts.Add($"L'utilisateur {participantId} n'est pas disponible à cette heure");
                        }
                    }
                }
            }

            return conflicts;
        }
    }
}