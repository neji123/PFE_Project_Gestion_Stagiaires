using Microsoft.Extensions.Logging;
using PFE.Application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.application.Services
{
    public class MeetingService : IMeetingService
    {
        private readonly IMeetingRepository _meetingRepository;
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly ILogger<MeetingService> _logger;

        public MeetingService(
            IMeetingRepository meetingRepository,
            IUserRepository userRepository,
            IEmailService emailService,
            ILogger<MeetingService> logger)
        {
            _meetingRepository = meetingRepository;
            _userRepository = userRepository;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<IEnumerable<MeetingDto>> GetAllMeetingsAsync()
        {
            var meetings = await _meetingRepository.GetAllAsync();
            return meetings.Select(MapToDto);
        }

        public async Task<MeetingDto?> GetMeetingByIdAsync(int id)
        {
            var meeting = await _meetingRepository.GetByIdAsync(id);
            return meeting != null ? MapToDto(meeting) : null;
        }

        public async Task<IEnumerable<MeetingDto>> GetMeetingsByUserAsync(int userId)
        {
            var meetings = await _meetingRepository.GetByUserIdAsync(userId);
            return meetings.Select(MapToDto);
        }

        public async Task<IEnumerable<MeetingDto>> GetMeetingsByFilterAsync(MeetingFilterDto filter)
        {
            var meetings = await _meetingRepository.GetByFilterAsync(filter);
            return meetings.Select(MapToDto);
        }

        public async Task<MeetingDto> CreateMeetingAsync(CreateMeetingDto createDto)
        {
            // Validation
            await ValidateCreateDto(createDto);

            var meeting = new Meeting
            {
                Title = createDto.Title,
                Type = ParseMeetingType(createDto.Type),
                Date = DateTime.ParseExact(createDto.Date, "yyyy-MM-dd", null),
                Time = TimeSpan.Parse(createDto.Time),
                Duration = createDto.Duration,
                Description = createDto.Description,
                Location = createDto.Location,
                Status = ParseMeetingStatus(createDto.Status),
                IsRecurring = createDto.IsRecurring,
                OrganizerId = createDto.OrganizerId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var createdMeeting = await _meetingRepository.AddAsync(meeting);

            // Ajouter les participants
            if (createDto.ParticipantIds.Any())
            {
                await _meetingRepository.AddParticipantsAsync(createdMeeting.Id, createDto.ParticipantIds);
            }

            // Recharger le meeting avec les participants
            var fullMeeting = await _meetingRepository.GetByIdAsync(createdMeeting.Id);

            // 🔧 PATTERN EXACT du RatingService
            await SendMeetingNotificationAsync(fullMeeting!.Id);

            return MapToDto(fullMeeting!);
        }

        public async Task<MeetingDto> UpdateMeetingAsync(int id, UpdateMeetingDto updateDto)
        {
            var meeting = await _meetingRepository.GetByIdAsync(id);
            if (meeting == null)
            {
                throw new KeyNotFoundException("Meeting non trouvé");
            }

            // Stocker les anciens participants pour détecter les changements
            var oldParticipantIds = meeting.ParticipantIds.ToList();
            bool dateTimeChanged = false;

            // Mise à jour des propriétés
            if (updateDto.Title != null) meeting.Title = updateDto.Title;
            if (updateDto.Type != null) meeting.Type = ParseMeetingType(updateDto.Type);

            if (updateDto.Date != null)
            {
                var newDate = DateTime.ParseExact(updateDto.Date, "yyyy-MM-dd", null);
                if (meeting.Date != newDate)
                {
                    meeting.Date = newDate;
                    dateTimeChanged = true;
                }
            }

            if (updateDto.Time != null)
            {
                var newTime = TimeSpan.Parse(updateDto.Time);
                if (meeting.Time != newTime)
                {
                    meeting.Time = newTime;
                    dateTimeChanged = true;
                }
            }

            if (updateDto.Duration != null && meeting.Duration != updateDto.Duration.Value)
            {
                meeting.Duration = updateDto.Duration.Value;
                dateTimeChanged = true;
            }

            if (updateDto.Description != null) meeting.Description = updateDto.Description;
            if (updateDto.Location != null) meeting.Location = updateDto.Location;
            if (updateDto.Status != null) meeting.Status = ParseMeetingStatus(updateDto.Status);
            if (updateDto.IsRecurring != null) meeting.IsRecurring = updateDto.IsRecurring.Value;

            meeting.UpdatedAt = DateTime.UtcNow;

            var updatedMeeting = await _meetingRepository.UpdateAsync(meeting);

            // Gérer les participants si fournis
            bool participantsChanged = false;
            if (updateDto.ParticipantIds != null)
            {
                // Supprimer tous les participants existants
                var existingParticipantIds = meeting.ParticipantIds;
                if (existingParticipantIds.Any())
                {
                    await _meetingRepository.RemoveParticipantsAsync(id, existingParticipantIds);
                }

                // Ajouter les nouveaux participants
                if (updateDto.ParticipantIds.Any())
                {
                    await _meetingRepository.AddParticipantsAsync(id, updateDto.ParticipantIds);
                }

                // Vérifier si les participants ont changé
                participantsChanged = !oldParticipantIds.SequenceEqual(updateDto.ParticipantIds);
            }

            // Recharger le meeting avec les participants
            var fullMeeting = await _meetingRepository.GetByIdAsync(id);

            // Envoyer des emails si nécessaire
            if (dateTimeChanged || participantsChanged)
            {
                await SendMeetingNotificationAsync(fullMeeting!.Id);
            }

            return MapToDto(fullMeeting!);
        }

        public async Task DeleteMeetingAsync(int id)
        {
            var meeting = await _meetingRepository.GetByIdAsync(id);
            if (meeting == null)
            {
                throw new KeyNotFoundException("Meeting non trouvé");
            }

            // Envoyer des emails d'annulation avant de supprimer
            await SendMeetingCancellationNotificationAsync(id);

            await _meetingRepository.DeleteAsync(id);
        }

        public async Task<bool> CheckAvailabilityAsync(int userId, DateTime date, TimeSpan time, int duration, int? excludeMeetingId = null)
        {
            return !await _meetingRepository.HasConflictAsync(userId, date, time, duration, excludeMeetingId);
        }

        private async Task ValidateCreateDto(CreateMeetingDto createDto)
        {
            // Vérifier que l'organisateur existe
            var organizer = await _userRepository.GetByIdAsync(createDto.OrganizerId);
            if (organizer == null)
            {
                throw new ArgumentException("Organisateur non trouvé");
            }

            // Vérifier que tous les participants existent
            foreach (var participantId in createDto.ParticipantIds)
            {
                var participant = await _userRepository.GetByIdAsync(participantId);
                if (participant == null)
                {
                    throw new ArgumentException($"Participant {participantId} non trouvé");
                }
            }

            // Vérifier que la date n'est pas dans le passé
            var meetingDateTime = DateTime.ParseExact(createDto.Date, "yyyy-MM-dd", null).Add(TimeSpan.Parse(createDto.Time));
            if (meetingDateTime < DateTime.Now)
            {
                throw new ArgumentException("Impossible de planifier un meeting dans le passé");
            }
        }

        private MeetingDto MapToDto(Meeting meeting)
        {
            return new MeetingDto
            {
                Id = meeting.Id,
                Title = meeting.Title,
                Type = meeting.Type.ToString().ToLower().Replace("tuteurstagiaire", "tuteur-stagiaire").Replace("rhstagiaire", "rh-stagiaire"),
                Date = meeting.Date.ToString("yyyy-MM-dd"),
                Time = meeting.Time.ToString(@"hh\:mm"),
                Duration = meeting.Duration,
                Description = meeting.Description,
                Location = meeting.Location,
                Status = meeting.Status.ToString().ToLower(),
                IsRecurring = meeting.IsRecurring,
                OrganizerId = meeting.OrganizerId,
                ParticipantIds = meeting.ParticipantIds,
                Participants = meeting.Participants?.Select(p => new UserDto
                {
                    Id = p.Id,
                    Username = p.Username,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    Email = p.Email,
                    Role = p.Role.ToString(),
                    TuteurId = p.TuteurId
                }).ToList(),
                CreatedAt = meeting.CreatedAt,
                UpdatedAt = meeting.UpdatedAt
            };
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

        // 🔧 COPIE EXACTE du pattern RatingService.SendRatingNotificationAsync
        public async Task SendMeetingNotificationAsync(int meetingId)
        {
            var meeting = await _meetingRepository.GetByIdAsync(meetingId);
            if (meeting == null) return;

            try
            {
                // Pour chaque participant
                foreach (var participantId in meeting.ParticipantIds)
                {
                    var participant = await _userRepository.GetByIdAsync(participantId);
                    if (participant == null || string.IsNullOrEmpty(participant.Email)) continue;

                    // Ne pas envoyer à l'organisateur
                    if (participant.Id == meeting.OrganizerId) continue;

                    // Email optionnel - EXACTEMENT comme dans RatingService
                    if (_emailService != null)
                    {
                        await _emailService.SendEmailAsync(
                            participant.Email,
                            $"Nouveau meeting programmé: {meeting.Title}",
                            $"Vous avez été invité à un nouveau meeting. Connectez-vous pour consulter les détails."
                        );

                        Console.WriteLine($"✅ Email envoyé à {participant.Email} pour le meeting {meeting.Title}");
                    }
                    else
                    {
                        Console.WriteLine("❌ _emailService est NULL !");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de l'envoi de notification pour le meeting {meetingId}: {ex.Message}");
            }
        }

        public async Task SendMeetingCancellationNotificationAsync(int meetingId)
        {
            var meeting = await _meetingRepository.GetByIdAsync(meetingId);
            if (meeting == null) return;

            try
            {
                foreach (var participantId in meeting.ParticipantIds)
                {
                    var participant = await _userRepository.GetByIdAsync(participantId);
                    if (participant == null || string.IsNullOrEmpty(participant.Email)) continue;
                    if (participant.Id == meeting.OrganizerId) continue;

                    if (_emailService != null)
                    {
                        await _emailService.SendEmailAsync(
                            participant.Email,
                            $"Meeting annulé: {meeting.Title}",
                            $"Le meeting a été annulé. Vous pouvez le retirer de votre calendrier."
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de l'envoi de notification d'annulation pour le meeting {meetingId}: {ex.Message}");
            }
        }
    }
}