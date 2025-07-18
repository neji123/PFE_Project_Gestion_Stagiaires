using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;

namespace PFE.infracstructure.Repositories
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public ProjectRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Project>> GetAllAsync()
        {
            return await _dbContext.Projects
                .Include(p => p.ProjectUsers)
                    .ThenInclude(pu => pu.User)
                .Include(p => p.Sprints)
                .ToListAsync();
        }

        public async Task<Project> GetByIdAsync(int id)
        {
            return await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Project> GetByIdWithDetailsAsync(int id)
        {
            return await _dbContext.Projects
                .Include(p => p.ProjectUsers)
                    .ThenInclude(pu => pu.User)
                .Include(p => p.Sprints)
                    .ThenInclude(s => s.Tasks)
                        .ThenInclude(t => t.AssignedTo)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Project>> GetProjectsForUserAsync(int userId)
        {
            return await _dbContext.Projects
                .Include(p => p.ProjectUsers)
                    .ThenInclude(pu => pu.User)
                .Include(p => p.Sprints)
                .Where(p => p.ProjectUsers.Any(pu => pu.UserId == userId))
                .ToListAsync();
        }

        public async Task AddAsync(Project project)
        {
            await _dbContext.Projects.AddAsync(project);
            await _dbContext.SaveChangesAsync();
        }

        public async Task UpdateAsync(Project project)
        {
            _dbContext.Projects.Update(project);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteAsync(Project project)
        {
            _dbContext.Projects.Remove(project);
            await _dbContext.SaveChangesAsync();
        }

        public async Task AssignUsersToProjectAsync(int projectId, IEnumerable<int> userIds)
        {
            // Récupérer les assignations existantes
            var existingAssignments = await _dbContext.ProjectUsers
                .Where(pu => pu.ProjectId == projectId)
                .Select(pu => pu.UserId)
                .ToListAsync();

            // Ajouter uniquement les nouveaux utilisateurs
            foreach (var userId in userIds)
            {
                if (!existingAssignments.Contains(userId))
                {
                    await _dbContext.ProjectUsers.AddAsync(new ProjectUser
                    {
                        ProjectId = projectId,
                        UserId = userId,
                        AssignedDate = System.DateTime.UtcNow
                    });
                }
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task RemoveUserFromProjectAsync(int projectId, int userId)
        {
            var assignment = await _dbContext.ProjectUsers
                .FirstOrDefaultAsync(pu => pu.ProjectId == projectId && pu.UserId == userId);

            if (assignment != null)
            {
                _dbContext.ProjectUsers.Remove(assignment);
                await _dbContext.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<User>> GetProjectUsersAsync(int projectId)
        {
            return await _dbContext.ProjectUsers
            .Where(pu => pu.ProjectId == projectId)
            .Include(pu => pu.User)
            .Select(pu => pu.User)
            .ToListAsync();
        }

        public async Task<bool> UpdateProjectUsersAsync(int projectId, List<string> usersToAdd, List<string> usersToRemove)
        {
            try
            {
                // Supprimer les associations à retirer
                if (usersToRemove != null && usersToRemove.Any())
                {
                    foreach (var userIdStr in usersToRemove)
                    {
                        if (int.TryParse(userIdStr, out var userId))
                        {
                            var association = await _dbContext.ProjectUsers
                                .FirstOrDefaultAsync(pu => pu.ProjectId == projectId && pu.UserId == userId);

                            if (association != null)
                            {
                                _dbContext.ProjectUsers.Remove(association);
                            }
                        }
                    }
                }

                // Ajouter les nouvelles associations
                if (usersToAdd != null && usersToAdd.Any())
                {
                    foreach (var userIdStr in usersToAdd)
                    {
                        if (int.TryParse(userIdStr, out var userId))
                        {
                            var exists = await _dbContext.ProjectUsers
                                .AnyAsync(pu => pu.ProjectId == projectId && pu.UserId == userId);

                            if (!exists)
                            {
                                _dbContext.ProjectUsers.Add(new ProjectUser
                                {
                                    ProjectId = projectId,
                                    UserId = userId
                                });
                            }
                        }
                    }
                }

                await _dbContext.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }


        public async Task<IEnumerable<Project>> GetProjectsByUserIdAsync(int userId)
        {
            // Utiliser la table de jointure ProjectUser pour récupérer les projets
            return await _dbContext.Projects
                .Include(p => p.ProjectUsers)
                    .ThenInclude(pu => pu.User)
                .Where(p => p.ProjectUsers.Any(pu => pu.UserId == userId))
                .ToListAsync();
        }

    }
    }

