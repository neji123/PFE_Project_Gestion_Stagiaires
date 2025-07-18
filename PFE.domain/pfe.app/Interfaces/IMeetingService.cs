using PFE.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
    public interface IMeetingService
    {
        Task<IEnumerable<MeetingDto>> GetAllMeetingsAsync();
        Task<MeetingDto?> GetMeetingByIdAsync(int id);
        Task<IEnumerable<MeetingDto>> GetMeetingsByUserAsync(int userId);
        Task<IEnumerable<MeetingDto>> GetMeetingsByFilterAsync(MeetingFilterDto filter);
        Task<MeetingDto> CreateMeetingAsync(CreateMeetingDto createDto);
        Task<MeetingDto> UpdateMeetingAsync(int id, UpdateMeetingDto updateDto);
        Task DeleteMeetingAsync(int id);
        Task<bool> CheckAvailabilityAsync(int userId, DateTime date, TimeSpan time, int duration, int? excludeMeetingId = null);
    }
}
