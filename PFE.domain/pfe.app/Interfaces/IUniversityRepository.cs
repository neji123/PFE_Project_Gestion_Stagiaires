using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
  public interface IUniversityRepository
    {
        Task<List<University>> GetAllUniversitiesAsync();
        Task<University> GetUniversityByIdAsync(int id);
        Task<University> AddUniversityAsync(University university);
        Task<University> UpdateUniversityAsync(University university);
        Task<bool> DeleteUniversityAsync(int id);
        Task<bool> UniversityExistsAsync(int id);
        Task<bool> UniversityNameExistsAsync(string name);
    }
}
