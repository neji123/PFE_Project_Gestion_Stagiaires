using Microsoft.EntityFrameworkCore;
using PFE.application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.infrastructure.Repositories
{
    public class UniversityRepository : IUniversityRepository
    {
        private readonly ApplicationDbContext _context;

        public UniversityRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<University>> GetAllUniversitiesAsync()
        {
            return await _context.Universities.ToListAsync();
        }

        public async Task<University> GetUniversityByIdAsync(int id)
        {
            return await _context.Universities.FindAsync(id);
        }

        public async Task<University> AddUniversityAsync(University university)
        {
            _context.Universities.Add(university);
            await _context.SaveChangesAsync();
            return university;
        }

        public async Task<University> UpdateUniversityAsync(University university)
        {
            _context.Entry(university).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return university;
        }

        public async Task<bool> DeleteUniversityAsync(int id)
        {
            var university = await _context.Universities.FindAsync(id);
            if (university == null)
                return false;

            _context.Universities.Remove(university);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UniversityExistsAsync(int id)
        {
            return await _context.Universities.AnyAsync(u => u.Id == id);
        }

        public async Task<bool> UniversityNameExistsAsync(string name)
        {
            return await _context.Universities.AnyAsync(u => u.Universityname.ToLower() == name.ToLower());
        }
    }
}
