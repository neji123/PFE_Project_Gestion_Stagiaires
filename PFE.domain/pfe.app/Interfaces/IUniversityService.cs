using PFE.application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
     public interface IUniversityService
    {
        Task<List<UniversityDto>> GetAllUniversitiesAsync();
        Task<UniversityDto> GetUniversityByIdAsync(int id);
        Task<UniversityDto> CreateUniversityAsync(UniversityDto universityDto);
        Task<UniversityDto> UpdateUniversityAsync(int id, UniversityDto universityDto);
        Task<bool> DeleteUniversityAsync(int id);
    }
}
