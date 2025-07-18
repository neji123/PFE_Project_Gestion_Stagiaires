using PFE.application.Interfaces;

namespace PFE.application.Services
{
    public class UniversityService : IUniversityService
    {
        public Task<List<UniversityDto>> GetAllUniversitiesAsync()
        {
            throw new NotImplementedException();
        }

        public Task<UniversityDto> GetUniversityByIdAsync(int id)
        {
            throw new NotImplementedException();
        }

        public Task<UniversityDto> CreateUniversityAsync(UniversityDto universityDto)
        {
            throw new NotImplementedException();
        }

        public Task<UniversityDto> UpdateUniversityAsync(int id, UniversityDto universityDto)
        {
            throw new NotImplementedException();
        }

        public Task<bool> DeleteUniversityAsync(int id)
        {
            throw new NotImplementedException();
        }
    }
}
