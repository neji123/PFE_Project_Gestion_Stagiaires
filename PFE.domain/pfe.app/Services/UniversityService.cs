using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Services
{
   public class UniversityService : IUniversityService
    {
        private readonly IUniversityRepository _universityRepository;

        public UniversityService(IUniversityRepository universityRepository)
        {
            _universityRepository = universityRepository;
        }

        public async Task<List<UniversityDto>> GetAllUniversitiesAsync()
        {
            var universities = await _universityRepository.GetAllUniversitiesAsync();
            return universities.Select(u => new UniversityDto
            {
                Id = u.Id,
                Universityname = u.Universityname
            }).ToList();
        }

        public async Task<UniversityDto> GetUniversityByIdAsync(int id)
        {
            var university = await _universityRepository.GetUniversityByIdAsync(id);

            if (university == null)
                return null;

            return new UniversityDto
            {
                Id = university.Id,
                Universityname = university.Universityname
            };
        }

        public async Task<UniversityDto> CreateUniversityAsync(UniversityDto universityDto)
        {
            // Check if university name already exists
            if (await _universityRepository.UniversityNameExistsAsync(universityDto.Universityname))
                throw new System.Exception("Une université avec ce nom existe déjà.");

            var university = new University
            {
                Universityname = universityDto.Universityname
            };

            var result = await _universityRepository.AddUniversityAsync(university);

            return new UniversityDto
            {
                Id = result.Id,
                Universityname = result.Universityname
            };
        }

        public async Task<UniversityDto> UpdateUniversityAsync(int id, UniversityDto universityDto)
        {
            if (id != universityDto.Id)
                throw new System.Exception("Les identifiants ne correspondent pas.");

            // Check if university exists
            var existingUniversity = await _universityRepository.GetUniversityByIdAsync(id);
            if (existingUniversity == null)
                throw new System.Exception("Université non trouvée.");

            // Check if name is already used by another university
            if (existingUniversity.Universityname != universityDto.Universityname &&
                await _universityRepository.UniversityNameExistsAsync(universityDto.Universityname))
                throw new System.Exception("Une université avec ce nom existe déjà.");

            existingUniversity.Universityname = universityDto.Universityname;

            var result = await _universityRepository.UpdateUniversityAsync(existingUniversity);

            return new UniversityDto
            {
                Id = result.Id,
                Universityname = result.Universityname
            };
        }

        public async Task<bool> DeleteUniversityAsync(int id)
        {
            return await _universityRepository.DeleteUniversityAsync(id);
        }
    }
}
