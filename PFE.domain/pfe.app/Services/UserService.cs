using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.application.Services;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;

namespace PFE.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly string _jwtSecret;
        private readonly int _jwtLifespan;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;
        public UserService(IUserRepository userRepository, string jwtSecret, int jwtLifespan, IProjectRepository projectRepository, IPasswordHasher<User> passwordHasher, IConfiguration configuration, IEmailService emailService, INotificationService notificationService, IHubContext<NotificationHub> hubContext)
        {
            _userRepository = userRepository;
            _jwtSecret = jwtSecret;
            _jwtLifespan = jwtLifespan;
            _projectRepository = projectRepository;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
            _emailService = emailService;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        public async Task<AuthResponseDto> Register(UserRegistrationDto registrationDto)
        {
            // Vérifier que les mots de passe correspondent
            if (registrationDto.Password != registrationDto.ConfirmPassword)
            {
                throw new Exception("Les mots de passe ne correspondent pas.");
            }

            // Vérifier l'unicité du Username
            var existingUserByUsername = await _userRepository.GetByUsernameAsync(registrationDto.Username);
            if (existingUserByUsername != null)
            {
                throw new Exception("Le nom d'utilisateur est déjà utilisé.");
            }

            // Vérifier l'unicité de l'Email
            var existingUserByEmail = await _userRepository.GetByEmailAsync(registrationDto.Email);
            if (existingUserByEmail != null)
            {
                throw new Exception("L'email est déjà utilisé.");
            }

            // Création de l'utilisateur avec mot de passe haché
            var user = new User
            {
                Username = registrationDto.Username,
                Email = registrationDto.Email,
                PasswordHash = HashPassword(registrationDto.Password),
                FirstName = registrationDto.FirstName,
                LastName = registrationDto.LastName,
                PhoneNumber = registrationDto.PhoneNumber,
                Role = Enum.TryParse<UserRole>(registrationDto.Role, out var role) ? role : UserRole.Admin,
                YearsExperience = registrationDto.YearsExperience,
                StartDate = registrationDto.StartDate,
                EndDate = registrationDto.EndDate,
                Note = registrationDto.Note,
                //  statuts = registrationDto.statuts
            };

            // Gérer le TuteurId pour éviter la violation de contrainte FK
            if (registrationDto.TuteurId == 0)
            {
                user.TuteurId = null;
            }
            else
            {
                user.TuteurId = registrationDto.TuteurId;
            }

            // Gérer le DepartmentId depuis le DTO (plutôt que de convertir en enum)
            if (registrationDto.DepartmentId > 0)
            {

                user.DepartmentId = registrationDto.DepartmentId;
            }
            else
            {
                user.DepartmentId = null;
            }


            // Gérer le UniversityId depuis le DTO
            if (registrationDto.UniversityId.HasValue && registrationDto.UniversityId > 0)
            {
                user.UniversityId = registrationDto.UniversityId;
            }
            else
            {
                user.UniversityId = null;
            }

            // Gérer le stage si présent
            if (!string.IsNullOrEmpty(registrationDto.Stage) &&
                Enum.TryParse<stage>(registrationDto.Stage, true, out var stageValue))
            {
                user.stage = stageValue;
            }

            // Gérer le type d'étudiant si présent
            if (!string.IsNullOrEmpty(registrationDto.Etudiant) &&
                Enum.TryParse<etudiant>(registrationDto.Etudiant, true, out var etudiantValue))
            {
                user.etudiant = etudiantValue;
            }

            if (registrationDto.ProfilePicture != null && registrationDto.ProfilePicture.Length > 0)
            {
                // exemple: on va enregistrer dans un dossier "wwwroot/uploads"
                // Vous pouvez personnaliser le chemin
                var folderPath = Path.Combine("wwwroot", "uploads");
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                // Nom unique pour éviter les conflits (ex: GUID + extension)
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(registrationDto.ProfilePicture.FileName)}";
                var filePath = Path.Combine(folderPath, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await registrationDto.ProfilePicture.CopyToAsync(stream);
                }

                // Stocker le chemin (relatif ou absolu) dans l'utilisateur
                // Par exemple : /uploads/nom_du_fichier
                user.ProfilePictureUrl = $"/uploads/{fileName}";
            }

            if (registrationDto.statuts.HasValue)
            {
                // Si une valeur est explicitement fournie, l'utiliser
                user.statuts = registrationDto.statuts.Value;
            }
            else
            {
                // Par défaut, tous les utilisateurs sont inactifs jusqu'à validation
                user.statuts = false;
            }

            await _userRepository.AddAsync(user);

            // NOUVELLE PARTIE: Notifications pour les inscriptions de stagiaires
            bool adminNotificationSent = false;
            bool rhNotificationSent = false;
            bool userNotificationSent = false;
            bool adminNotificationStored = false;
            bool rhNotificationStored = false;
            bool userNotificationStored = false;

            // Vérifier si l'utilisateur inscrit est un stagiaire
            if (user.Role == UserRole.Stagiaire)
            {
                try
                {
                    // Message de notification pour les admins et RHs
                    var newStagiaireMessage = $"Nouveau stagiaire inscrit: {user.FirstName} {user.LastName} ({user.Username}).";

                    // 1. Envoyer notification aux admins via SignalR
                    await _hubContext.Clients.Group("Admins").SendAsync("ReceiveNotification", newStagiaireMessage);
                    adminNotificationSent = true;

                    // Stocker la notification pour chaque admin dans la base de données
                    var adminUsers = await _userRepository.GetUsersByRoleAsync(UserRole.Admin);
                    foreach (var admin in adminUsers)
                    {
                        var adminNotification = new CreateNotificationDto
                        {
                            Title = "Nouveau stagiaire",
                            Message = newStagiaireMessage,
                            Type = NotificationType.UserRegistration,
                            UserId = admin.Id,
                            RelatedEntityId = user.Id.ToString()
                        };
                        await _notificationService.CreateNotificationAsync(adminNotification);
                    }
                    adminNotificationStored = true;

                    // 2. Envoyer notification aux RHs via SignalR
                    await _hubContext.Clients.Group("RHs").SendAsync("ReceiveNotification", newStagiaireMessage);
                    rhNotificationSent = true;

                    // Stocker la notification pour chaque RH dans la base de données
                    var rhUsers = await _userRepository.GetUsersByRoleAsync(UserRole.RHs);
                    foreach (var rh in rhUsers)
                    {
                        var rhNotification = new CreateNotificationDto
                        {
                            Title = "Nouveau stagiaire",
                            Message = newStagiaireMessage,
                            Type = NotificationType.UserRegistration,
                            UserId = rh.Id,
                            RelatedEntityId = user.Id.ToString()
                        };
                        await _notificationService.CreateNotificationAsync(rhNotification);
                    }
                    rhNotificationStored = true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur en envoyant/stockant notification pour le nouveau stagiaire : {ex.Message}");
                }
            }

            // 3. Envoyer notification de bienvenue à l'utilisateur nouvellement inscrit (quel que soit son rôle)
            try
            {
                var welcomeMessage = $"Bienvenue {user.FirstName} dans notre plateforme !";
                await _hubContext.Clients.User(user.Id.ToString()).SendAsync("ReceiveNotification", welcomeMessage);
                userNotificationSent = true;

                // Stocker notification utilisateur dans la base de données
                var userNotification = new CreateNotificationDto
                {
                    Title = "Bienvenue",
                    Message = welcomeMessage,
                    Type = NotificationType.Welcome,
                    UserId = user.Id,
                    RelatedEntityId = user.Id.ToString()
                };
                await _notificationService.CreateNotificationAsync(userNotification);
                userNotificationStored = true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur en envoyant/stockant notification à l'utilisateur : {ex.Message}");
            }

            // Générer et retourner le JWT
            return GenerateAuthResponse(user);
        }

        public async Task<AuthResponseDto> Login(UserLoginDto loginDto)
        {
            var user = await _userRepository.GetByUsernameOrEmailAsync(loginDto.UsernameOrEmail);
            if (user == null || user.PasswordHash != HashPassword(loginDto.Password))
            {
                throw new Exception("Identifiants invalides.");
            }
            if (user.statuts == false)
            {
                throw new Exception("Vous n'êtes pas autorisé à vous connecter à l'application. Veuillez contacter l'administration.");
            }
            return GenerateAuthResponse(user);
        }

        private string HashPassword(string password)
        {
            // Pour la simplicité, on utilise SHA256 (en production, privilégiez une approche plus sécurisée avec salt)
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        private AuthResponseDto GenerateAuthResponse(User user)
        {
            var expiration = DateTime.UtcNow.AddMinutes(_jwtLifespan);
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                }),
                Expires = expiration,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return new AuthResponseDto
            {
                Token = tokenHandler.WriteToken(token),
                Expiration = expiration
            };
        }

        public async Task<User> GetUserByIdAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }
            return user;
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task UpdateUserAsync(User user)
        {
            // Vous pouvez ajouter ici des validations supplémentaires avant la mise à jour
            var existingUser = await _userRepository.GetByIdAsync(user.Id);
            if (existingUser == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            // Si le mot de passe a changé (et n'est pas déjà un hachage), hachez-le
            if (!string.IsNullOrEmpty(user.PasswordHash) && !IsPasswordHashed(user.PasswordHash))
            {
                user.PasswordHash = HashPassword(user.PasswordHash);
            }
            else
            {
                // Gardez l'ancien mot de passe si aucun nouveau n'est fourni
                user.PasswordHash = existingUser.PasswordHash;
            }

            await _userRepository.UpdateAsync(user);
        }
        private bool IsPasswordHashed(string password)
        {
            // Vérification simple basée sur la longueur et le format d'un hachage SHA256
            // Cette méthode peut être améliorée selon votre algorithme de hachage
            try
            {
                // Si c'est un hachage Base64 valide et de la bonne longueur
                byte[] bytes = Convert.FromBase64String(password);
                return bytes.Length == 32; // SHA256 produit 32 bytes (256 bits)
            }
            catch
            {
                return false; // Si ce n'est pas un Base64 valide, ce n'est pas un hachage
            }
        }


        public async Task DeleteUserAsync(int id)
        {
            try
            {
                Console.WriteLine($"Début suppression utilisateur {id}");

                var user = await _userRepository.GetByIdAsync(id);
                if (user == null)
                {
                    throw new Exception("Utilisateur non trouvé.");
                }

                Console.WriteLine($"Utilisateur trouvé: {user.Username} (Rôle: {user.Role})");

                // Vérifier les contraintes avant suppression
                await CheckDeletionConstraints(user);

                // Nettoyer les relations avant suppression
                await CleanupUserRelations(user);

                // Supprimer les fichiers associés
                await CleanupUserFiles(user);

                // Supprimer l'utilisateur
                await _userRepository.DeleteAsync(user);

                Console.WriteLine($"Utilisateur {id} supprimé avec succès");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de la suppression de l'utilisateur {id}: {ex.Message}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                throw;
            }
        }
        /// <summary>
        /// Obtient les dépendances d'un utilisateur
        /// </summary>
        public async Task<UserDependenciesDto> GetUserDependenciesAsync(int userId)
        {
            try
            {
                return await _userRepository.GetUserDependenciesAsync(userId);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur dans GetUserDependenciesAsync pour l'utilisateur {userId}: {ex.Message}");
                throw new Exception($"Erreur lors de la récupération des dépendances: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Supprime un utilisateur de manière sécurisée
        /// </summary>
        public async Task<bool> SafeDeleteUserAsync(int userId)
        {
            try
            {
                Console.WriteLine($"Début de la suppression sécurisée de l'utilisateur {userId}");

                // Vérifier que l'utilisateur existe
                var user = await _userRepository.GetByIdAsync(userId);
                if (user == null)
                {
                    throw new Exception("Utilisateur non trouvé.");
                }

                Console.WriteLine($"Utilisateur trouvé: {user.Username} (Rôle: {user.Role})");

                // Nettoyer les fichiers avant suppression
                await CleanupUserFiles(user);

                // Procéder à la suppression sécurisée
                var result = await _userRepository.SafeDeleteUserAsync(userId);

                if (result)
                {
                    Console.WriteLine($"Suppression sécurisée réussie pour l'utilisateur {userId}");
                }
                else
                {
                    Console.WriteLine($"Échec de la suppression sécurisée pour l'utilisateur {userId}");
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur dans SafeDeleteUserAsync pour l'utilisateur {userId}: {ex.Message}");
                throw new Exception($"Erreur lors de la suppression sécurisée: {ex.Message}", ex);
            }
        }
        private async Task CheckDeletionConstraints(User user)
        {
            // Vérifier si c'est un tuteur avec des stagiaires assignés
            if (user.Role == UserRole.Tuteur)
            {
                var stagiaires = await _userRepository.GetStagiairesByTuteurAsync(user.Id);
                if (stagiaires.Any())
                {
                    throw new Exception($"Impossible de supprimer ce tuteur car {stagiaires.Count()} stagiaire(s) lui sont assigné(s). Veuillez d'abord réassigner les stagiaires à un autre tuteur.");
                }
            }

            // Vérifier si l'utilisateur est assigné à des projets
            var projectAssignments = await _projectRepository.GetProjectsByUserIdAsync(user.Id);
            if (projectAssignments.Any())
            {
                throw new Exception($"Impossible de supprimer cet utilisateur car il est assigné à {projectAssignments.Count()} projet(s). Veuillez d'abord le retirer des projets.");
            }

            // Autres vérifications si nécessaire (rapports, notifications, etc.)
        }

        private async Task CleanupUserRelations(User user)
        {
            try
            {
                Console.WriteLine($"Nettoyage des relations pour l'utilisateur {user.Id}");

                // Si c'est un stagiaire, retirer l'assignation au tuteur
                if (user.Role == UserRole.Stagiaire && user.TuteurId.HasValue)
                {
                    Console.WriteLine($"Retrait de l'assignation au tuteur {user.TuteurId}");
                    user.TuteurId = null;
                    await _userRepository.UpdateAsync(user);
                }

                // Supprimer les notifications liées à cet utilisateur
                if (_notificationService != null)
                {
                    await _notificationService.DeleteNotificationAsync(user.Id);
                }

                // Retirer l'utilisateur de tous les projets
                var userProjects = await _projectRepository.GetProjectsByUserIdAsync(user.Id);
                foreach (var project in userProjects)
                {
                    await _projectRepository.RemoveUserFromProjectAsync(project.Id, user.Id);
                }

                Console.WriteLine("Nettoyage des relations terminé");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors du nettoyage des relations: {ex.Message}");
                // Ne pas faire échouer la suppression pour les erreurs de nettoyage non critiques
            }
        }

        private async Task CleanupUserFiles(User user)
        {
            try
            {
                Console.WriteLine($"Nettoyage des fichiers pour l'utilisateur {user.Id}");

                // Supprimer la photo de profil
                if (!string.IsNullOrEmpty(user.ProfilePictureUrl))
                {
                    await DeleteProfilePictureAsync(user.ProfilePictureUrl);
                }

                // Supprimer le CV
                if (!string.IsNullOrEmpty(user.CvUrl))
                {
                    await DeleteCvFileAsync(user.CvUrl);
                }

                Console.WriteLine("Nettoyage des fichiers terminé");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors du nettoyage des fichiers: {ex.Message}");
                // Ne pas faire échouer la suppression pour les erreurs de fichiers
            }
        }

        private async Task DeleteProfilePictureAsync(string profilePictureUrl)
        {
            try
            {
                if (string.IsNullOrEmpty(profilePictureUrl))
                    return;

                var filePath = Path.Combine("wwwroot", profilePictureUrl.TrimStart('/'));
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    Console.WriteLine($"Photo de profil supprimée: {filePath}");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de la suppression de la photo de profil: {ex.Message}");
            }
        }
        public async Task<IEnumerable<User>> GetStagiairesByTuteurAsync(int tuteurId)
        {
            // Vérifier d'abord si le tuteur existe
            var tuteur = await _userRepository.GetByIdAsync(tuteurId);
            if (tuteur == null || tuteur.Role != UserRole.Tuteur)
            {
                throw new Exception("Tuteur non trouvé.");
            }

            return await _userRepository.GetStagiairesByTuteurAsync(tuteurId);
        }

        public async Task<IEnumerable<User>> GetStagiairesSansTuteurAsync()
        {
            return await _userRepository.GetStagiairesSansTuteurAsync();
        }

        public async Task AffecterStagiairesAsync(int tuteurId, IEnumerable<int> stagiaireIds)
        {
            // Vérifier d'abord si le tuteur existe
            var tuteur = await _userRepository.GetByIdAsync(tuteurId);
            if (tuteur == null || tuteur.Role != UserRole.Tuteur)
            {
                throw new Exception("Tuteur non trouvé.");
            }

            await _userRepository.AffecterStagiairesAsync(tuteurId, stagiaireIds);
        }

        public async Task RetirerStagiaireAsync(int stagiaireId)
        {
            var stagiaire = await _userRepository.GetByIdAsync(stagiaireId);
            if (stagiaire == null || stagiaire.Role != UserRole.Stagiaire)
            {
                throw new Exception("Stagiaire non trouvé.");
            }

            await _userRepository.RetirerStagiaireAsync(stagiaireId);
        }
        public async Task<IEnumerable<User>> GetUsersByRoleAsync(string role)
        {
            if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            {
                throw new Exception("Rôle invalide");
            }

            return await _userRepository.GetUsersByRoleAsync(userRole);
        }

        public async Task<IEnumerable<User>> GetProjectUsersAsync(int projectId)
        {
            var project = await _projectRepository.GetByIdAsync(projectId);
            if (project == null)
            {
                throw new Exception("Projet non trouvé");
            }

            return await _projectRepository.GetProjectUsersAsync(projectId);
        }

        public async Task<bool> UpdateProjectUsersAsync(int projectId, List<string> usersToAdd, List<string> usersToRemove)
        {
            var project = await _projectRepository.GetByIdAsync(projectId);
            if (project == null)
            {
                throw new Exception("Projet non trouvé");
            }

            return await _projectRepository.UpdateProjectUsersAsync(projectId, usersToAdd, usersToRemove);
        }

        public async Task<User> UpdateUserPartialAsync(int userId, UserUpdateDto updateDto)
        {
            try
            {
                // Vérifier l'existence de l'utilisateur
                var existingUser = await _userRepository.GetByIdAsync(userId);
                if (existingUser == null)
                {
                    throw new Exception("Utilisateur non trouvé.");
                }

                // Log pour debug
                Console.WriteLine($"Mise à jour de l'utilisateur {userId}");
                Console.WriteLine($"Statut reçu: {updateDto.Statuts}");

                // Stocker la valeur initiale du statut pour vérifier s'il y a un changement
                bool initialStatus = existingUser.statuts ?? false;

                // Mise à jour des propriétés de base avec vérification null et validation
                if (!string.IsNullOrWhiteSpace(updateDto.Username))
                {
                    // Vérifier l'unicité du username
                    var existingByUsername = await _userRepository.GetByUsernameAsync(updateDto.Username);
                    if (existingByUsername != null && existingByUsername.Id != userId)
                    {
                        throw new Exception("Ce nom d'utilisateur est déjà utilisé.");
                    }
                    existingUser.Username = updateDto.Username;
                }

                if (!string.IsNullOrWhiteSpace(updateDto.Email))
                {
                    // Vérifier l'unicité de l'email
                    var existingByEmail = await _userRepository.GetByEmailAsync(updateDto.Email);
                    if (existingByEmail != null && existingByEmail.Id != userId)
                    {
                        throw new Exception("Cet email est déjà utilisé.");
                    }
                    existingUser.Email = updateDto.Email;
                }

                if (!string.IsNullOrWhiteSpace(updateDto.FirstName))
                    existingUser.FirstName = updateDto.FirstName;

                if (!string.IsNullOrWhiteSpace(updateDto.LastName))
                    existingUser.LastName = updateDto.LastName;

                if (!string.IsNullOrWhiteSpace(updateDto.PhoneNumber))
                    existingUser.PhoneNumber = updateDto.PhoneNumber;

                // Gestion du rôle
                if (!string.IsNullOrWhiteSpace(updateDto.Role) && Enum.TryParse<UserRole>(updateDto.Role, out var role))
                    existingUser.Role = role;

                // Gestion du mot de passe
                if (!string.IsNullOrEmpty(updateDto.Password) && !IsPasswordHashed(updateDto.Password))
                {
                    existingUser.PasswordHash = HashPassword(updateDto.Password);
                }

                // Gestion de la photo de profil
                if (updateDto.ProfilePicture != null && updateDto.ProfilePicture.Length > 0)
                {
                    var profilePicturePath = await SaveProfilePictureAsync(updateDto.ProfilePicture);
                    existingUser.ProfilePictureUrl = profilePicturePath;
                }
                else if (!string.IsNullOrWhiteSpace(updateDto.ProfilePictureUrl))
                {
                    existingUser.ProfilePictureUrl = updateDto.ProfilePictureUrl;
                }

                // Relations
                if (updateDto.TuteurId.HasValue)
                    existingUser.TuteurId = updateDto.TuteurId.Value == 0 ? null : updateDto.TuteurId;

                if (updateDto.DepartmentId.HasValue)
                    existingUser.DepartmentId = updateDto.DepartmentId.Value == 0 ? null : updateDto.DepartmentId;

                if (updateDto.UniversityId.HasValue)
                    existingUser.UniversityId = updateDto.UniversityId.Value == 0 ? null : updateDto.UniversityId;

                // Propriétés tuteur
                if (updateDto.YearsExperience.HasValue)
                    existingUser.YearsExperience = updateDto.YearsExperience;

                // Propriétés stagiaire
                if (updateDto.StartDate.HasValue)
                    existingUser.StartDate = updateDto.StartDate;

                if (updateDto.EndDate.HasValue)
                    existingUser.EndDate = updateDto.EndDate;

                if (updateDto.Note.HasValue)
                    existingUser.Note = updateDto.Note;

                // Conversion des enums
                if (!string.IsNullOrWhiteSpace(updateDto.Stage) && Enum.TryParse<stage>(updateDto.Stage, out var stageEnum))
                    existingUser.stage = stageEnum;

                if (!string.IsNullOrWhiteSpace(updateDto.Etudiant) && Enum.TryParse<etudiant>(updateDto.Etudiant, out var etudiantEnum))
                    existingUser.etudiant = etudiantEnum;

                // Variable pour détecter le changement de statut
                bool statusChanged = false;

                // Statut - IMPORTANT: Gestion explicite du statut
                if (updateDto.Statuts.HasValue)
                {
                    Console.WriteLine($"Changement de statut: {existingUser.statuts} -> {updateDto.Statuts.Value}");
                    // Vérifier si le statut passe de inactif à actif
                    statusChanged = !initialStatus && updateDto.Statuts.Value;
                    existingUser.statuts = updateDto.Statuts.Value;
                }

                // Gestion des Skills
                if (!string.IsNullOrWhiteSpace(updateDto.Skills))
                {
                    // Valider que l'utilisateur peut avoir des compétences
                    if (existingUser.Role == UserRole.Stagiaire || existingUser.Role == UserRole.Tuteur)
                    {
                        existingUser.Skills = updateDto.Skills;
                    }
                }

                // Gestion du CV
                if (updateDto.CvFile != null && updateDto.CvFile.Length > 0)
                {
                    // Valider que l'utilisateur peut avoir un CV
                    if (existingUser.Role == UserRole.Stagiaire || existingUser.Role == UserRole.Tuteur)
                    {
                        // Supprimer l'ancien CV s'il existe
                        if (!string.IsNullOrEmpty(existingUser.CvUrl))
                        {
                            await DeleteCvFileAsync(existingUser.CvUrl);
                        }

                        // Sauvegarder le nouveau CV
                        var cvPath = await SaveCvFileAsync(updateDto.CvFile, userId);
                        existingUser.CvUrl = cvPath;
                        existingUser.CvOriginalFileName = updateDto.CvFile.FileName;
                        existingUser.CvUploadedAt = DateTime.UtcNow;
                    }
                }

                // Enregistrer les modifications
                await _userRepository.UpdateAsync(existingUser);

                Console.WriteLine($"Utilisateur {userId} mis à jour avec succès. Nouveau statut: {existingUser.statuts}");

                // Si le statut a changé de inactif (false) à actif (true), envoyer un email
                if (statusChanged)
                {
                    try
                    {
                        await SendAccountActivationEmailAsync(existingUser);
                        Console.WriteLine($"Email d'activation envoyé à {existingUser.Email}");
                    }
                    catch (Exception ex)
                    {
                        // Log l'erreur mais ne pas faire échouer la mise à jour
                        Console.Error.WriteLine($"Erreur lors de l'envoi de l'email d'activation: {ex.Message}");
                    }
                }

                return existingUser;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur dans UpdateUserPartialAsync: {ex.Message}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                throw;
            }
        }

        private async Task<string> SaveProfilePictureAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return null;

            var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine("wwwroot/uploads/profile-pictures", fileName);

            Directory.CreateDirectory(Path.GetDirectoryName(filePath));

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return "/uploads/profile-pictures/" + fileName;
        }

        public async Task<bool> VerifyPasswordAsync(int userId, string password)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            // Utiliser la même méthode de hachage pour la vérification
            string hashedPassword = HashPassword(password);

            // Comparer les hachages
            return user.PasswordHash == hashedPassword;
        }

        //google auth 
        public async Task<AuthResponseDto> ExternalLoginAsync(ExternalAuthDto externalAuth)
        {
            if (externalAuth == null)
                throw new ArgumentNullException(nameof(externalAuth));

            if (string.IsNullOrEmpty(externalAuth.Provider) || string.IsNullOrEmpty(externalAuth.IdToken))
                throw new Exception("Provider et IdToken sont requis.");

            if (externalAuth.Provider.ToLower() != "google")
                throw new Exception("Seule l'authentification Google est prise en charge pour le moment.");

            try
            {
                Console.WriteLine("------------- DÉBUT AUTHENTIFICATION GOOGLE -------------");
                Console.WriteLine($"Longueur du token: {externalAuth.IdToken.Length}");

                // Valider le jeton Google
                GoogleJsonWebSignature.Payload payload;
                try
                {
                    payload = await ValidateGoogleTokenAsync(externalAuth.IdToken);
                    // Si on arrive ici, la validation a réussi
                    Console.WriteLine("Validation du token Google réussie");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Échec de la validation du token: {ex.Message}");
                    throw new Exception("Jeton Google invalide: " + ex.Message, ex);
                }

                // Vérifier si le payload est valide
                if (payload == null || string.IsNullOrEmpty(payload.Email))
                {
                    throw new Exception("Le jeton Google ne contient pas d'email valide.");
                }

                // Extraire les informations utilisateur
                var email = payload.Email;
                Console.WriteLine($"Email extrait du token: {email}");

                // Vérifier si l'utilisateur existe déjà
                var user = await _userRepository.GetByEmailAsync(email);

                if (user == null)
                {
                    Console.WriteLine($"Création d'un nouvel utilisateur pour: {email}");

                    // Créer un nouvel utilisateur à partir des informations Google
                    var username = email.Split('@')[0];

                    // Vérifier si le nom d'utilisateur est déjà pris
                    var existingUsername = await _userRepository.GetByUsernameAsync(username);
                    if (existingUsername != null)
                    {
                        // Générer un nom d'utilisateur unique
                        username = $"{username}{Guid.NewGuid().ToString().Substring(0, 6)}";
                        Console.WriteLine($"Nom d'utilisateur généré: {username}");
                    }

                    user = new User
                    {
                        Email = email,
                        Username = username,
                        FirstName = payload.GivenName ?? email.Split('@')[0],
                        LastName = payload.FamilyName ?? "",
                        // Générer un mot de passe aléatoire
                        PasswordHash = HashPassword(Guid.NewGuid().ToString()),
                        Role = UserRole.Stagiaire, // Par défaut, à modifier selon votre logique
                        statuts = false, // Inactif par défaut, jusqu'à validation par RH
                        PhoneNumber = "+216" // Valeur par défaut, à mettre à jour par l'utilisateur
                    };

                    await _userRepository.AddAsync(user);
                    Console.WriteLine("Nouvel utilisateur créé avec succès");
                }
                else
                {
                    Console.WriteLine($"Utilisateur existant trouvé: {user.Username}, ID: {user.Id}");
                }

                // Générer le JWT comme pour un login normal
                var authResponse = GenerateAuthResponse(user);
                Console.WriteLine($"JWT généré avec succès, expiration: {authResponse.Expiration}");
                Console.WriteLine("------------- FIN AUTHENTIFICATION GOOGLE -------------");

                return authResponse;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERREUR dans ExternalLoginAsync: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"InnerException: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        private async Task<GoogleJsonWebSignature.Payload> ValidateGoogleTokenAsync(string token)
        {
            try
            {
                Console.WriteLine("Début de la validation du token Google");
                Console.WriteLine($"Token length: {token.Length}");

                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    // Récupérer votre ClientId depuis la configuration
                    Audience = new[] { _configuration["Authentication:Google:ClientId"] }
                };

                Console.WriteLine($"Client ID utilisé pour validation: {_configuration["Authentication:Google:ClientId"]}");

                // Désactiver certaines vérifications
                settings.HostedDomain = null;
                // Tolérance pour les problèmes d'horloge
                settings.IssuedAtClockTolerance = TimeSpan.FromMinutes(10);
                settings.ExpirationTimeClockTolerance = TimeSpan.FromMinutes(10);

                try
                {
                    var payload = await GoogleJsonWebSignature.ValidateAsync(token, settings);

                    if (payload != null)
                    {
                        Console.WriteLine($"Validation réussie! Email: {payload.Email}");
                        Console.WriteLine($"Nom complet: {payload.Name}");
                        return payload;
                    }
                    else
                    {
                        Console.WriteLine("Payload null après validation");
                        throw new Exception("Payload null après validation du token");
                    }
                }
                catch (Google.Apis.Auth.InvalidJwtException ijEx)
                {
                    Console.WriteLine($"Token JWT invalide: {ijEx.Message}");

                    // Pour déboguer, imprimez l'exception détaillée
                    if (ijEx.InnerException != null)
                    {
                        Console.WriteLine($"Cause: {ijEx.InnerException.Message}");
                        Console.WriteLine($"Stack: {ijEx.InnerException.StackTrace}");
                    }

                    // Essayez une approche alternative pour extraire les informations du token
                    try
                    {
                        // Analyser manuellement le token JWT pour en extraire le payload
                        var tokenParts = token.Split('.');
                        if (tokenParts.Length != 3)
                        {
                            throw new Exception("Format de token invalide, il ne contient pas 3 parties");
                        }

                        // Décoder le payload (deuxième partie du token)
                        string paddedBase64 = tokenParts[1].PadRight(tokenParts[1].Length + (4 - tokenParts[1].Length % 4) % 4, '=');
                        var payloadJson = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(paddedBase64));
                        Console.WriteLine($"Payload JSON: {payloadJson}");

                        // Créer un payload personnalisé
                        var payload = new GoogleJsonWebSignature.Payload();

                        // Utiliser System.Text.Json pour analyser le JSON
                        var payloadDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(payloadJson);

                        if (payloadDict.TryGetValue("email", out var emailElement))
                        {
                            payload.Email = emailElement.GetString();
                        }

                        if (payloadDict.TryGetValue("name", out var nameElement))
                        {
                            payload.Name = nameElement.GetString();
                        }

                        if (payloadDict.TryGetValue("given_name", out var givenNameElement))
                        {
                            payload.GivenName = givenNameElement.GetString();
                        }

                        if (payloadDict.TryGetValue("family_name", out var familyNameElement))
                        {
                            payload.FamilyName = familyNameElement.GetString();
                        }

                        // Si on a pu extraire un email, on considère que c'est valide
                        if (!string.IsNullOrEmpty(payload.Email))
                        {
                            Console.WriteLine($"Extraction manuelle réussie! Email: {payload.Email}");
                            return payload;
                        }

                        throw new Exception("Impossible d'extraire l'email du token");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erreur lors de l'extraction manuelle: {ex.Message}");
                        throw;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de la validation du token Google: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Cause interne: {ex.InnerException.Message}");
                }

                throw;
            }
        }

        public async Task<AuthResponseDto> ExternalLoginSimpleAsync(ExternalAuthDto externalAuth)
        {
            if (externalAuth == null)
                throw new ArgumentNullException(nameof(externalAuth));

            if (string.IsNullOrEmpty(externalAuth.Provider) || string.IsNullOrEmpty(externalAuth.IdToken))
                throw new Exception("Provider et IdToken sont requis.");

            try
            {
                Console.WriteLine("Utilisation de la méthode simplifiée d'authentification Google");

                // Extraire l'email du token JWT manuellement
                var tokenParts = externalAuth.IdToken.Split('.');
                if (tokenParts.Length != 3)
                    throw new Exception("Format de token invalide");

                // Décoder le payload (2ème partie)
                string paddedBase64 = tokenParts[1].PadRight(tokenParts[1].Length + (4 - tokenParts[1].Length % 4) % 4, '=');
                var payloadJson = Encoding.UTF8.GetString(Convert.FromBase64String(paddedBase64));

                // Deserialize le JSON
                var payloadDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(payloadJson);

                string email = null;
                string name = null;
                string firstName = null;
                string lastName = null;

                if (payloadDict.TryGetValue("email", out var emailElement))
                    email = emailElement.GetString();

                if (payloadDict.TryGetValue("name", out var nameElement))
                    name = nameElement.GetString();

                if (payloadDict.TryGetValue("given_name", out var givenNameElement))
                    firstName = givenNameElement.GetString();

                if (payloadDict.TryGetValue("family_name", out var familyNameElement))
                    lastName = familyNameElement.GetString();

                if (string.IsNullOrEmpty(email))
                    throw new Exception("Impossible d'extraire l'email du token");

                Console.WriteLine($"Email extrait: {email}");

                // Rechercher l'utilisateur par email
                var user = await _userRepository.GetByEmailAsync(email);

                // S'il n'existe pas, le créer
                if (user == null)
                {
                    var username = email.Split('@')[0];

                    // Vérification du nom d'utilisateur
                    var existingUsername = await _userRepository.GetByUsernameAsync(username);
                    if (existingUsername != null)
                        username = $"{username}{Guid.NewGuid().ToString().Substring(0, 6)}";

                    user = new User
                    {
                        Email = email,
                        Username = username,
                        FirstName = firstName ?? (name?.Split(' ').FirstOrDefault() ?? email.Split('@')[0]),
                        LastName = lastName ?? (name?.Split(' ').Skip(1).FirstOrDefault() ?? ""),
                        PasswordHash = HashPassword(Guid.NewGuid().ToString()),
                        Role = UserRole.Tuteur,
                        statuts = false,
                        PhoneNumber = "+216"
                    };

                    await _userRepository.AddAsync(user);
                    Console.WriteLine($"Nouvel utilisateur créé: {user.Username}");
                }

                // Générer le JWT
                var authResponse = GenerateAuthResponse(user);
                return authResponse;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur dans ExternalLoginSimpleAsync: {ex.Message}");
                throw;
            }
        }

        // Méthode d'aide pour générer un mot de passe aléatoire
        private string GenerateRandomPassword()
        {
            return Guid.NewGuid().ToString("N").Substring(0, 12);
        }

        public async Task SendPasswordResetEmailAsync(string email)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                // Pour des raisons de sécurité, ne pas indiquer que l'utilisateur n'existe pas
                // Simplement retourner sans envoyer d'email
                return;
            }

            // Générer un token de réinitialisation
            var resetToken = GenerateResetToken();

            // Stocker le token et sa date d'expiration
            user.PasswordResetToken = resetToken;
            user.PasswordResetTokenExpires = DateTime.UtcNow.AddHours(24); // Expire après 24 heures

            await _userRepository.UpdateAsync(user);

            // Générer l'URL de réinitialisation
            var frontendUrl = _configuration["FrontendUrl"]; // Ex: "http://localhost:4200"
            var resetUrl = $"{frontendUrl}/reset-password?token={resetToken}&email={System.Web.HttpUtility.UrlEncode(email)}";

            // Préparer le contenu de l'email
            var subject = "Réinitialisation de votre mot de passe";
            var body = $@"
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe:</p>
        <p><a href='{resetUrl}'>Réinitialiser mon mot de passe</a></p>
        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
        <p>Ce lien expirera dans 24 heures.</p>
        <p>Cordialement,<br>L'équipe Benz Internship Management</p>
    ";

            // Envoyer l'email
            await _emailService.SendEmailAsync(email, subject, body);
        }

        // Méthode pour réinitialiser le mot de passe
        public async Task<bool> ResetPasswordAsync(string token, string email, string newPassword)
        {
            // Rechercher l'utilisateur
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                return false;
            }

            // Vérifier que le token est valide
            if (user.PasswordResetToken != token)
            {
                return false;
            }

            // Vérifier que le token n'est pas expiré
            if (user.PasswordResetTokenExpires == null || user.PasswordResetTokenExpires < DateTime.UtcNow)
            {
                return false;
            }

            // Mettre à jour le mot de passe
            user.PasswordHash = HashPassword(newPassword);

            // Réinitialiser le token (une utilisation unique)
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpires = null;

            await _userRepository.UpdateAsync(user);
            return true;
        }

        private string GenerateResetToken()
        {
            // Générer un token unique
            return Guid.NewGuid().ToString("N");
        }

        /// <summary>
        /// Envoie un email de notification lorsqu'un compte est activé
        /// </summary>
        private async Task SendAccountActivationEmailAsync(User user)
        {
            // Vérifier que l'utilisateur et son email existent
            if (user == null || string.IsNullOrEmpty(user.Email))
            {
                return;
            }

            // Préparer le contenu de l'email
            var subject = "Votre compte a été activé";
            var frontendUrl = _configuration["FrontendUrl"]; // Ex: "http://localhost:4200"

            // Adapter le message en fonction du rôle
            string roleMessage = "";
            switch (user.Role)
            {
                case UserRole.Stagiaire:
                    roleMessage = "en tant que stagiaire";
                    break;
                case UserRole.Tuteur:
                    roleMessage = "en tant que tuteur";
                    break;
                case UserRole.RHs:
                    roleMessage = "en tant que responsable RH";
                    break;
                default:
                    roleMessage = "";
                    break;
            }

            var body = $@"
        <h2>Bienvenue sur l'application de gestion des stages</h2>
        <p>Bonjour {user.FirstName} {user.LastName},</p>
        <p>Votre compte {roleMessage} a été activé avec succès.</p>
        <p>Vous pouvez maintenant vous connecter à l'application en utilisant votre nom d'utilisateur ou email et votre mot de passe.</p>
        <p><a href='{frontendUrl}/login'>Cliquez ici pour vous connecter</a></p>
        <p>Si vous rencontrez des difficultés pour vous connecter, veuillez contacter l'administrateur.</p>
        <p>Cordialement,<br>L'équipe Internship Management</p>
    ";

            // Envoyer l'email
            await _emailService.SendEmailAsync(user.Email, subject, body);
        }



        public async Task<IEnumerable<object>> GetCompletedStagiairesForAttestationAsync()
        {
            var completedStagiaires = await _userRepository.GetCompletedStagiairesAsync();

            return completedStagiaires.Select(s => new
            {
                Id = s.Id,
                FullName = $"{s.FirstName} {s.LastName}",
                Username = s.Username,
                Email = s.Email,
                StartDate = s.StartDate,
                EndDate = s.EndDate,
                DepartmentName = s.Department?.DepartmentName ?? "Non spécifié",
                UniversityName = s.University?.Universityname ?? "Non spécifié",
                Stage = s.stage?.ToString() ?? "Non spécifié",
                StudentType = s.etudiant?.ToString() ?? "Non spécifié",
                Note = s.Note,
                TuteurName = s.Tuteur != null ? $"{s.Tuteur.FirstName} {s.Tuteur.LastName}" : "Non assigné"
            });
        }

        /// <summary>
        /// Met à jour les compétences d'un utilisateur
        /// </summary>
        public async Task<User> UpdateUserSkillsAsync(int userId, string skills)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            // Valider que l'utilisateur est soit un stagiaire soit un tuteur
            if (user.Role != UserRole.Stagiaire && user.Role != UserRole.Tuteur)
            {
                throw new Exception("Seuls les stagiaires et tuteurs peuvent ajouter des compétences.");
            }

            user.Skills = skills;
            await _userRepository.UpdateAsync(user);

            return user;
        }

        /// <summary>
        /// Upload du CV pour un utilisateur
        /// </summary>
        public async Task<User> UploadUserCvAsync(int userId, IFormFile cvFile)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            // Valider que l'utilisateur est soit un stagiaire soit un tuteur
            if (user.Role != UserRole.Stagiaire && user.Role != UserRole.Tuteur)
            {
                throw new Exception("Seuls les stagiaires et tuteurs peuvent uploader un CV.");
            }

            // Valider le fichier
            if (cvFile == null || cvFile.Length == 0)
            {
                throw new Exception("Aucun fichier CV fourni.");
            }

            // Valider le type de fichier (PDF, DOC, DOCX)
            var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
            var fileExtension = Path.GetExtension(cvFile.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(fileExtension))
            {
                throw new Exception("Format de fichier non supporté. Utilisez PDF, DOC ou DOCX.");
            }

            // Valider la taille du fichier (max 5MB)
            const int maxFileSize = 5 * 1024 * 1024; // 5MB
            if (cvFile.Length > maxFileSize)
            {
                throw new Exception("Le fichier CV ne peut pas dépasser 5MB.");
            }

            // Supprimer l'ancien CV s'il existe
            if (!string.IsNullOrEmpty(user.CvUrl))
            {
                await DeleteCvFileAsync(user.CvUrl);
            }

            // Sauvegarder le nouveau CV
            var cvPath = await SaveCvFileAsync(cvFile, userId);

            // Mettre à jour l'utilisateur
            user.CvUrl = cvPath;
            user.CvOriginalFileName = cvFile.FileName;
            user.CvUploadedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user);

            return user;
        }

        /// <summary>
        /// Supprime le CV d'un utilisateur
        /// </summary>
        public async Task<User> DeleteUserCvAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            if (!string.IsNullOrEmpty(user.CvUrl))
            {
                await DeleteCvFileAsync(user.CvUrl);

                user.CvUrl = null;
                user.CvOriginalFileName = null;
                user.CvUploadedAt = null;

                await _userRepository.UpdateAsync(user);
            }

            return user;
        }

        /// <summary>
        /// Récupère les informations du CV d'un utilisateur
        /// </summary>
        public async Task<object> GetUserCvInfoAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new Exception("Utilisateur non trouvé.");
            }

            return new
            {
                HasCv = !string.IsNullOrEmpty(user.CvUrl),
                CvUrl = user.CvUrl,
                OriginalFileName = user.CvOriginalFileName,
                UploadedAt = user.CvUploadedAt,
                Skills = user.Skills
            };
        }

        /// <summary>
        /// Sauvegarde le fichier CV
        /// </summary>
        private async Task<string> SaveCvFileAsync(IFormFile cvFile, int userId)
        {
            if (cvFile == null || cvFile.Length == 0)
                return null;

            // Créer le dossier s'il n'existe pas
            var cvFolderPath = Path.Combine("wwwroot", "uploads", "cv");
            if (!Directory.Exists(cvFolderPath))
            {
                Directory.CreateDirectory(cvFolderPath);
            }

            // Générer un nom de fichier unique
            var fileExtension = Path.GetExtension(cvFile.FileName);
            var fileName = $"cv_{userId}_{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(cvFolderPath, fileName);

            // Sauvegarder le fichier
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await cvFile.CopyToAsync(stream);
            }

            // Retourner le chemin relatif
            return $"/uploads/cv/{fileName}";
        }

        /// <summary>
        /// Supprime un fichier CV du disque
        /// </summary>
        private async Task DeleteCvFileAsync(string cvUrl)
        {
            if (string.IsNullOrEmpty(cvUrl))
                return;

            try
            {
                // Convertir l'URL relative en chemin physique
                var filePath = Path.Combine("wwwroot", cvUrl.TrimStart('/'));

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            catch (Exception ex)
            {
                // Logger l'erreur mais ne pas faire échouer l'opération
                Console.WriteLine($"Erreur lors de la suppression du fichier CV: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont affectés à aucun projet
        /// </summary>
        public async Task<IEnumerable<UserSimpleDto>> GetUnassignedStagiairesAsync()
        {
            try
            {
                var unassignedStagiaires = await _userRepository.GetUnassignedStagiairesAsync();

                return unassignedStagiaires.Select(s => new UserSimpleDto
                {
                    Id = s.Id,
                    Username = s.Username,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    Email = s.Email,
                    Role = s.Role.ToString(),
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    University = s.University?.Universityname,
                    Department = s.Department?.DepartmentName,
                    ProfilePictureUrl = s.ProfilePictureUrl,
                    Statuts = s.statuts,
                    IsAssignedToProject = false, // Par définition, ils ne sont affectés à aucun projet
                    ProjectCount = 0
                });
            }
            catch (Exception ex)
            {
                throw new Exception($"Erreur lors de la récupération des stagiaires non affectés: {ex.Message}");
            }
        }

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont pas affectés à un projet spécifique
        /// </summary>
        public async Task<IEnumerable<UserSimpleDto>> GetStagiairesNotInProjectAsync(int excludeProjectId)
        {
            try
            {
                var availableStagiaires = await _userRepository.GetStagiairesNotInProjectAsync(excludeProjectId);

                return availableStagiaires.Select(s => new UserSimpleDto
                {
                    Id = s.Id,
                    Username = s.Username,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    Email = s.Email,
                    Role = s.Role.ToString(),
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    University = s.University?.Universityname,
                    Department = s.Department?.DepartmentName,
                    ProfilePictureUrl = s.ProfilePictureUrl,
                    Statuts = s.statuts,
                    IsAssignedToProject = s.ProjectUsers.Any(), // Vrai s'ils sont dans d'autres projets
                    ProjectCount = s.ProjectUsers.Count()
                });
            }
            catch (Exception ex)
            {
                throw new Exception($"Erreur lors de la récupération des stagiaires disponibles pour le projet {excludeProjectId}: {ex.Message}");
            }
        }



    }
}