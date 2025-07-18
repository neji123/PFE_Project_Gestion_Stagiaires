using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using PFE.infracstructure.Persistence;

namespace PFE.infracstructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _dbContext;
        public UserRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<User> GetByIdAsync(int id)
        {
            return await _dbContext.Users
                .Include(u => u.Department)
                .Include(u => u.University)
                .Include(u => u.ProjectUsers)
                    .ThenInclude(pu => pu.Project)
                .Include(u => u.Tuteur)
                .Include(u => u.Stagiaires)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _dbContext.Users
               .Include(u => u.Department)
               .Include(u => u.University)
               .Include(u => u.ProjectUsers)
                   .ThenInclude(pu => pu.Project)
               .ToListAsync();
        }

        public async Task<User> GetByUsernameAsync(string username)
        {
            return await _dbContext.Users
               .Include(u => u.Department)
               .Include(u => u.University)
               .Include(u => u.ProjectUsers)
                   .ThenInclude(pu => pu.Project)
               .FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<User> GetByEmailAsync(string email)
        {
            return await _dbContext.Users
             .Include(u => u.Department)
             .Include(u => u.University)
             .Include(u => u.ProjectUsers)
                 .ThenInclude(pu => pu.Project)
             .FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<IEnumerable<User>> GetByRoleAsync(UserRole role)
        {
            return await _dbContext.Users
                .Include(u => u.Department)
                .Include(u => u.University)
                .Include(u => u.ProjectUsers)
                    .ThenInclude(pu => pu.Project)
                .Where(u => u.Role == role)
                .ToListAsync();
        }

        public async Task<User> GetByUsernameOrEmailAsync(string usernameOrEmail)
        {
            return await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Username == usernameOrEmail || u.Email == usernameOrEmail);
        }

        public async Task AddAsync(User user)
        {
            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync();
        }

        public async Task UpdateAsync(User user)
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteAsync(User user)
        {
            _dbContext.Users.Remove(user);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<IEnumerable<User>> GetStagiairesByTuteurAsync(int tuteurId)
        {
            return await _dbContext.Users
                .Where(u => u.Role == UserRole.Stagiaire && u.TuteurId == tuteurId)
                .ToListAsync();
        }

        public async Task<IEnumerable<User>> GetStagiairesSansTuteurAsync()
        {
            return await _dbContext.Users
                .Where(u => u.Role == UserRole.Stagiaire && u.TuteurId == null)
                .ToListAsync();
        }

        public async Task AffecterStagiairesAsync(int tuteurId, IEnumerable<int> stagiaireIds)
        {
            var ids = stagiaireIds.ToList();

            // Approche 1: Récupérer chaque stagiaire individuellement pour éviter les problèmes avec Contains
            foreach (var id in ids)
            {
                var stagiaire = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Stagiaire);

                if (stagiaire != null)
                {
                    stagiaire.TuteurId = tuteurId;
                }
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task RetirerStagiaireAsync(int stagiaireId)
        {
            var stagiaire = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == stagiaireId && u.Role == UserRole.Stagiaire);

            if (stagiaire != null)
            {
                stagiaire.TuteurId = null;
                await _dbContext.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role)
        {
            return await _dbContext.Users
        .Where(u => u.Role == role)
        .ToListAsync();
        }

        public async Task<IEnumerable<User>> GetRecentUsersAsync(int count)
        {
            // Récupérer les stagiaires récents (avec StartDate non null)
            var recentStagiaires = await _dbContext.Users
                .Where(u => u.Role == UserRole.Stagiaire && u.StartDate != null)
                .OrderByDescending(u => u.StartDate)
                .Take(count)
                .ToListAsync();

            // Si nous n'avons pas assez de stagiaires, compléter avec d'autres utilisateurs
            if (recentStagiaires.Count < count)
            {
                var remainingCount = count - recentStagiaires.Count;
                var otherUsers = await _dbContext.Users
                    .Where(u => u.Role != UserRole.Stagiaire || u.StartDate == null)
                    .OrderByDescending(u => u.Id)
                    .Take(remainingCount)
                    .ToListAsync();

                return recentStagiaires.Concat(otherUsers);
            }

            return recentStagiaires;
        }

        public async Task<IEnumerable<User>> GetCompletedStagiairesAsync()
        {
            // Remplacez _context par le nom de votre DbContext (probablement _dbContext ou similar)
            return await _dbContext.Users  // Changez _context par votre nom de contexte
                .Include(u => u.Department)
                .Include(u => u.University)
                .Include(u => u.Tuteur)
                .Where(u => u.Role == UserRole.Stagiaire &&
                           u.EndDate.HasValue &&
                           u.EndDate.Value <= DateTime.Now &&
                           u.statuts == true)
                .OrderByDescending(u => u.EndDate)
                .ToListAsync();
        }

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont affectés à aucun projet
        /// </summary>
        public async Task<IEnumerable<User>> GetUnassignedStagiairesAsync()
        {
            return await _dbContext.Users
                .Where(u => u.Role == UserRole.Stagiaire &&
                           !u.ProjectUsers.Any()) // Aucune affectation à un projet
                .Include(u => u.University)
                .Include(u => u.Department)
                .Include(u => u.Tuteur)
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .ToListAsync();
        }

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont pas affectés à un projet spécifique
        /// </summary>
        public async Task<IEnumerable<User>> GetStagiairesNotInProjectAsync(int excludeProjectId)
        {
            return await _dbContext.Users
                .Where(u => u.Role == UserRole.Stagiaire &&
                           !u.ProjectUsers.Any(pu => pu.ProjectId == excludeProjectId)) // Pas dans ce projet
                .Include(u => u.University)
                .Include(u => u.Department)
                .Include(u => u.Tuteur)
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .ToListAsync();
        }
        /// <summary>
        /// Vérifie si un utilisateur peut être supprimé (pas de contraintes)
        /// </summary>
        public async Task<bool> CanDeleteUserAsync(int userId)
        {
            // Vérifier si c'est un tuteur avec des stagiaires
            var stagiaires = await _dbContext.Users
                .Where(u => u.TuteurId == userId)
                .CountAsync();

            if (stagiaires > 0)
                return false;

            // Vérifier si l'utilisateur est dans des projets
            var projectAssignments = await _dbContext.Set<ProjectUser>()
                .Where(pu => pu.UserId == userId)
                .CountAsync();

            if (projectAssignments > 0)
                return false;

            // Ajouter d'autres vérifications si nécessaire

            return true;
        }

        /// <summary>
        /// Supprime un utilisateur avec gestion des contraintes
        /// </summary>
        public async Task<bool> SafeDeleteUserAsync(int userId)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                var user = await _dbContext.Users
                    .Include(u => u.ProjectUsers)
                    .Include(u => u.Notifications)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return false;

                // Retirer l'utilisateur de tous les projets
                if (user.ProjectUsers.Any())
                {
                    _dbContext.Set<ProjectUser>().RemoveRange(user.ProjectUsers);
                }

                // Supprimer les notifications
                if (user.Notifications.Any())
                {
                    _dbContext.Set<Notification>().RemoveRange(user.Notifications);
                }

                // Si c'est un tuteur, retirer l'assignation des stagiaires
                if (user.Role == UserRole.Tuteur)
                {
                    var stagiaires = await _dbContext.Users
                        .Where(u => u.TuteurId == userId)
                        .ToListAsync();

                    foreach (var stagiaire in stagiaires)
                    {
                        stagiaire.TuteurId = null;
                    }
                }

                // Supprimer l'utilisateur
                _dbContext.Users.Remove(user);
                await _dbContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new Exception($"Erreur lors de la suppression: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Obtient des informations sur les dépendances d'un utilisateur
        /// </summary>
        public async Task<UserDependenciesDto> GetUserDependenciesAsync(int userId)
        {
            var user = await _dbContext.Users.FindAsync(userId);
            if (user == null)
                return null;

            var dependencies = new UserDependenciesDto
            {
                UserId = userId,
                Username = user.Username,
                Role = user.Role.ToString()
            };

            // Compter les stagiaires si c'est un tuteur
            if (user.Role == UserRole.Tuteur)
            {
                dependencies.StagiairesCount = await _dbContext.Users
                    .CountAsync(u => u.TuteurId == userId);
            }

            // Compter les projets assignés
            dependencies.ProjectsCount = await _dbContext.Set<ProjectUser>()
                .CountAsync(pu => pu.UserId == userId);

            // Compter les notifications
            dependencies.NotificationsCount = await _dbContext.Set<Notification>()
                .CountAsync(n => n.UserId == userId);

            dependencies.CanDelete = dependencies.StagiairesCount == 0 &&
                                   dependencies.ProjectsCount == 0;

            return dependencies;
        }
    }
}

