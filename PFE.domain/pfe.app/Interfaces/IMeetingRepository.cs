using PFE.Application.DTOs;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
    public interface IMeetingRepository
    {
        Task<IEnumerable<Meeting>> GetAllAsync();
        Task<Meeting?> GetByIdAsync(int id);
        Task<IEnumerable<Meeting>> GetByUserIdAsync(int userId);
        Task<IEnumerable<Meeting>> GetByOrganizerIdAsync(int organizerId);
        Task<IEnumerable<Meeting>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<Meeting>> GetByFilterAsync(MeetingFilterDto filter);
        Task<Meeting> AddAsync(Meeting meeting);
        Task<Meeting> UpdateAsync(Meeting meeting);
        Task DeleteAsync(int id);
        Task AddParticipantsAsync(int meetingId, List<int> participantIds);
        Task RemoveParticipantsAsync(int meetingId, List<int> participantIds);
        Task<bool> HasConflictAsync(int userId, DateTime date, TimeSpan time, int duration, int? excludeMeetingId = null);
    }
}
