using System.Collections.Generic;
using System.Threading.Tasks;
using PFE.Application.DTOs;

namespace PFE.Application.Interfaces
{
    public interface ISprintService
    {
        Task<IEnumerable<SprintDto>> GetAllSprintsAsync();
        Task<SprintDto> GetSprintByIdAsync(int id);
        Task<IEnumerable<SprintDto>> GetSprintsByProjectIdAsync(int projectId);
        Task<SprintDto> CreateSprintAsync(SprintCreateDto sprintDto);
        Task UpdateSprintAsync(int id, SprintUpdateDto sprintDto);
        Task UpdateSprintStatusAsync(int id, SprintStatusUpdateDto statusDto);
        Task DeleteSprintAsync(int id);
    }
}
