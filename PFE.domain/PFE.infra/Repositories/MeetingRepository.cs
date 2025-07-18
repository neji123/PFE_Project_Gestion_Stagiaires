// Infrastructure/Repositories/MeetingRepository.cs
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging;
using PFE.application.Interfaces;
using PFE.application.Services;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.Application.Services;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;
using PFE.infracstructure.Repositories;

using PFE.Infrastructure.Repositories;

namespace PFE.Infrastructure.Repositories
{
    public class MeetingRepository : IMeetingRepository
    {
        private readonly ApplicationDbContext _context;
       
        private readonly ILogger<MeetingRepository> _logger;

        public MeetingRepository(ApplicationDbContext context, ILogger<MeetingRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<Meeting>> GetAllAsync()
        {
            return await _context.Meetings
                .Include(m => m.Organizer)
                .Include(m => m.MeetingParticipants)
                    .ThenInclude(mp => mp.User)
                .OrderByDescending(m => m.Date)
                .ThenBy(m => m.Time)
                .ToListAsync();
        }

        public async Task<Meeting?> GetByIdAsync(int id)
        {
            return await _context.Meetings
                .Include(m => m.Organizer)
                .Include(m => m.MeetingParticipants)
                    .ThenInclude(mp => mp.User)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<IEnumerable<Meeting>> GetByUserIdAsync(int userId)
        {
            return await _context.Meetings
                .Include(m => m.Organizer)
                .Include(m => m.MeetingParticipants)
                    .ThenInclude(mp => mp.User)
                .Where(m => m.OrganizerId == userId ||
                           m.MeetingParticipants.Any(mp => mp.UserId == userId))
                .OrderByDescending(m => m.Date)
                .ThenBy(m => m.Time)
                .ToListAsync();
        }

        public async Task<IEnumerable<Meeting>> GetByOrganizerIdAsync(int organizerId)
        {
            return await _context.Meetings
                .Include(m => m.Organizer)
                .Include(m => m.MeetingParticipants)
                    .ThenInclude(mp => mp.User)
                .Where(m => m.OrganizerId == organizerId)
                .OrderByDescending(m => m.Date)
                .ThenBy(m => m.Time)
                .ToListAsync();
        }

        public async Task<IEnumerable<Meeting>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.Meetings
                .Include(m => m.Organizer)
                .Include(m => m.MeetingParticipants)
                    .ThenInclude(mp => mp.User)
                .Where(m => m.Date >= startDate && m.Date <= endDate)
                .OrderBy(m => m.Date)
                .ThenBy(m => m.Time)
                .ToListAsync();
        }

        public async Task<IEnumerable<Meeting>> GetByFilterAsync(MeetingFilterDto filter)
        {
            var query = _context.Meetings
                .Include(m => m.Organizer)
                .Include(m => m.MeetingParticipants)
                    .ThenInclude(mp => mp.User)
                .AsQueryable();

            // Filtrer par type
            if (!string.IsNullOrEmpty(filter.Type) && filter.Type != "all")
            {
                var meetingType = ParseMeetingType(filter.Type);
                query = query.Where(m => m.Type == meetingType);
            }

            // Filtrer par statut
            if (!string.IsNullOrEmpty(filter.Status) && filter.Status != "all")
            {
                var meetingStatus = ParseMeetingStatus(filter.Status);
                query = query.Where(m => m.Status == meetingStatus);
            }

            // Filtrer par plage de dates
            if (filter.StartDate.HasValue)
            {
                query = query.Where(m => m.Date >= filter.StartDate.Value);
            }

            if (filter.EndDate.HasValue)
            {
                query = query.Where(m => m.Date <= filter.EndDate.Value);
            }

            // Filtrer par utilisateur (participant ou organisateur)
            if (filter.UserId.HasValue)
            {
                query = query.Where(m => m.OrganizerId == filter.UserId.Value ||
                                        m.MeetingParticipants.Any(mp => mp.UserId == filter.UserId.Value));
            }

            // Filtrer par organisateur
            if (filter.OrganizerId.HasValue)
            {
                query = query.Where(m => m.OrganizerId == filter.OrganizerId.Value);
            }

            return await query
                .OrderByDescending(m => m.Date)
                .ThenBy(m => m.Time)
                .ToListAsync();
        }

        public async Task<Meeting> AddAsync(Meeting meeting)
        {
            try
            {
                _context.Meetings.Add(meeting);
                await _context.SaveChangesAsync();
                return meeting;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la création du meeting");
                throw;
            }
        }

        public async Task<Meeting> UpdateAsync(Meeting meeting)
        {
            try
            {
                _context.Entry(meeting).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                return meeting;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la mise à jour du meeting {MeetingId}", meeting.Id);
                throw;
            }
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                var meeting = await _context.Meetings.FindAsync(id);
                if (meeting != null)
                {
                    _context.Meetings.Remove(meeting);
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la suppression du meeting {MeetingId}", id);
                throw;
            }
        }

        public async Task AddParticipantsAsync(int meetingId, List<int> participantIds)
        {
            try
            {
                var existingParticipants = await _context.MeetingParticipants
                    .Where(mp => mp.MeetingId == meetingId)
                    .Select(mp => mp.UserId)
                    .ToListAsync();

                var newParticipants = participantIds
                    .Where(id => !existingParticipants.Contains(id))
                    .Select(id => new MeetingParticipant
                    {
                        MeetingId = meetingId,
                        UserId = id,
                        JoinedAt = DateTime.UtcNow,
                        HasAccepted = false
                    });

                _context.MeetingParticipants.AddRange(newParticipants);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'ajout des participants au meeting {MeetingId}", meetingId);
                throw;
            }
        }

        public async Task RemoveParticipantsAsync(int meetingId, List<int> participantIds)
        {
            try
            {
                var participantsToRemove = await _context.MeetingParticipants
                    .Where(mp => mp.MeetingId == meetingId && participantIds.Contains(mp.UserId))
                    .ToListAsync();

                _context.MeetingParticipants.RemoveRange(participantsToRemove);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la suppression des participants du meeting {MeetingId}", meetingId);
                throw;
            }
        }

        public async Task<bool> HasConflictAsync(int userId, DateTime date, TimeSpan time, int duration, int? excludeMeetingId = null)
        {
            try
            {
                var startTime = time;
                var endTime = time.Add(TimeSpan.FromMinutes(duration));

                var query = _context.Meetings
                    .Where(m => m.Date.Date == date.Date &&
                               m.Status != MeetingStatus.Annule &&
                               (m.OrganizerId == userId ||
                                m.MeetingParticipants.Any(mp => mp.UserId == userId)));

                if (excludeMeetingId.HasValue)
                {
                    query = query.Where(m => m.Id != excludeMeetingId.Value);
                }

                var existingMeetings = await query.ToListAsync();

                return existingMeetings.Any(meeting =>
                {
                    var meetingStart = meeting.Time;
                    var meetingEnd = meeting.Time.Add(TimeSpan.FromMinutes(meeting.Duration));

                    // Vérifier le chevauchement
                    return (startTime < meetingEnd && endTime > meetingStart);
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la vérification des conflits pour l'utilisateur {UserId}", userId);
                throw;
            }
        }

        private MeetingType ParseMeetingType(string type)
        {
            return type.ToLower() switch
            {
                "tuteur-stagiaire" => MeetingType.TuteurStagiaire,
                "rh-stagiaire" => MeetingType.RhStagiaire,
                "evaluation" => MeetingType.Evaluation,
                "suivi" => MeetingType.Suivi,
                _ => throw new ArgumentException($"Type de meeting invalide: {type}")
            };
        }

        private MeetingStatus ParseMeetingStatus(string status)
        {
            return status.ToLower() switch
            {
                "planifie" => MeetingStatus.Planifie,
                "confirme" => MeetingStatus.Confirme,
                "annule" => MeetingStatus.Annule,
                "termine" => MeetingStatus.Termine,
                _ => throw new ArgumentException($"Statut de meeting invalide: {status}")
            };
        }
    }
}

