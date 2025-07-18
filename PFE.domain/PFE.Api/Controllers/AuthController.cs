using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using PFE.domain.Entities;
using System;
using System.Threading.Tasks;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IReportService _reportService;

        public UsersController(IUserService userService, IReportService reportService = null)
        {
            _userService = userService;
            _reportService = reportService;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        // GET: api/Users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(id);
                return Ok(user);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
        [HttpPost("register")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Register([FromForm] UserRegistrationDto registrationDto)
        {
            try
            {
                Console.WriteLine($"Tentative d'enregistrement: {registrationDto.Username}, Department: {registrationDto.DepartmentId}");

                var result = await _userService.Register(registrationDto);
                // Message spécifique pour les stagiaires
                if (registrationDto.Role == "Stagiaire")
                {
                    return Ok(new
                    {
                        token = result.Token,
                        expiration = result.Expiration,
                        message = "Votre compte a été créé avec succès mais doit être activé par un administrateur avant que vous puissiez vous connecter."
                    });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine("=== ERREUR LORS DE L'ENREGISTREMENT ===");
                Console.WriteLine($"Message original: {ex.Message}");
                Console.WriteLine($"Type: {ex.GetType().Name}");

                // Messages d'erreur spécifiques et clairs pour l'utilisateur
                string userMessage = "";
               
                if (ex.Message.Contains("nom d'utilisateur") && ex.Message.Contains("utilisé"))
                {
                    userMessage = "Ce nom d'utilisateur est déjà pris. Veuillez choisir un autre nom d'utilisateur.";
                    Console.WriteLine("=== DÉTECTION: Nom d'utilisateur déjà utilisé ===");
                }
                else if (ex.Message.Contains("email") && ex.Message.Contains("utilisé"))
                {
                    userMessage = "Cette adresse email est déjà utilisée. Veuillez utiliser une autre adresse email.";
                    Console.WriteLine("=== DÉTECTION: Email déjà utilisé ===");
                }
                else if (ex.Message.Contains("mots de passe") && ex.Message.Contains("correspondent"))
                {
                    userMessage = "Les mots de passe ne correspondent pas. Veuillez vérifier votre saisie.";
                    Console.WriteLine("=== DÉTECTION: Mots de passe ne correspondent pas ===");
                }
                else
                {
                    userMessage = "Une erreur s'est produite lors de la création du compte. Veuillez réessayer.";
                    Console.WriteLine("=== DÉTECTION: Autre erreur ===");
                }

                Console.WriteLine($"=== MESSAGE ENVOYÉ AU CLIENT: {userMessage} ===");

                var errorResponse = new
                {
                    message = userMessage,
                    success = false,
                    error = "RegistrationError"
                };

                Console.WriteLine($"=== RÉPONSE COMPLÈTE: {System.Text.Json.JsonSerializer.Serialize(errorResponse)} ===");

                return BadRequest(errorResponse);
            }
        }


        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto loginDto)
        {
            if (loginDto == null)
            {
                return BadRequest(new { message = "Le corps de la requête ne peut pas être vide" });
            }

            if (string.IsNullOrEmpty(loginDto.UsernameOrEmail))
            {
                return BadRequest(new { message = "Le nom d'utilisateur ou l'email est requis" });
            }

            if (string.IsNullOrEmpty(loginDto.Password))
            {
                return BadRequest(new { message = "Le mot de passe est requis" });
            }

            string passwordStatus = "null";
            if (loginDto != null && !string.IsNullOrEmpty(loginDto.Password))
            {
                passwordStatus = "***";
            }
            Console.WriteLine($"Login attempt - UsernameOrEmail: {(loginDto?.UsernameOrEmail ?? "null")}, Password: {passwordStatus}");

            try
            {
                var result = await _userService.Login(loginDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Login error: {ex.Message}");

                // Message spécifique pour les stagiaires inactifs
                if (ex.Message.Contains("Vous n'êtes pas autorisé"))
                {
                    return Unauthorized(new { message = ex.Message });
                }

                return BadRequest(new { message = ex.Message });
            }
        }





        // PUT: api/Users/{id} - Pour JSON
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateDto updateDto)
        {
            try
            {
                // Validation du modèle
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value.Errors.Count > 0)
                        .Select(x => new { Field = x.Key, Errors = x.Value.Errors.Select(e => e.ErrorMessage) })
                        .ToList();

                    Console.WriteLine($"Erreurs de validation: {System.Text.Json.JsonSerializer.Serialize(errors)}");
                    return BadRequest(new { message = "Données invalides", errors = errors });
                }

                // Log pour debug
                Console.WriteLine($"Tentative de mise à jour utilisateur {id}");
                Console.WriteLine($"DTO reçu: {System.Text.Json.JsonSerializer.Serialize(updateDto)}");

                var updatedUser = await _userService.UpdateUserPartialAsync(id, updateDto);

                // Si le statut a été modifié à "actif", ajouter un message dans la réponse
                if (updateDto.Statuts.HasValue && updateDto.Statuts.Value)
                {
                    return Ok(new
                    {
                        user = updatedUser,
                        message = "Utilisateur mis à jour avec succès. Un email de notification a été envoyé."
                    });
                }

                return Ok(new
                {
                    user = updatedUser,
                    message = "Utilisateur mis à jour avec succès."
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur dans UpdateUser: {ex.Message}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                return BadRequest(new { message = ex.Message, details = ex.ToString() });
            }
        }

        // PUT: api/Users/{id}/form - Pour multipart/form-data
        [HttpPut("{id}/form")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateUserFormData(int id, [FromForm] UserUpdateDto updateDto)
        {
            try
            {
                // Log pour debug
                Console.WriteLine($"Tentative de mise à jour utilisateur {id} via form-data");
                Console.WriteLine($"Statuts reçu: {updateDto.Statuts}");

                // Validation du modèle
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value.Errors.Count > 0)
                        .Select(x => new { Field = x.Key, Errors = x.Value.Errors.Select(e => e.ErrorMessage) })
                        .ToList();

                    Console.WriteLine($"Erreurs de validation: {System.Text.Json.JsonSerializer.Serialize(errors)}");
                    return BadRequest(new { message = "Données invalides", errors = errors });
                }

                var updatedUser = await _userService.UpdateUserPartialAsync(id, updateDto);

                // Si le statut a été modifié à "actif", ajouter un message dans la réponse
                if (updateDto.Statuts.HasValue && updateDto.Statuts.Value)
                {
                    return Ok(new
                    {
                        user = updatedUser,
                        message = "Utilisateur mis à jour avec succès. Un email de notification a été envoyé."
                    });
                }

                return Ok(new
                {
                    user = updatedUser,
                    message = "Utilisateur mis à jour avec succès."
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur dans UpdateUserFormData: {ex.Message}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");
                return BadRequest(new { message = ex.Message, details = ex.ToString() });
            }
        }

        // DELETE: api/Users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                Console.WriteLine($"=== DÉBUT SUPPRESSION UTILISATEUR {id} ===");

                // Vérifier d'abord si l'utilisateur existe
                var user = await _userService.GetUserByIdAsync(id);
                if (user == null)
                {
                    Console.WriteLine($"Utilisateur {id} non trouvé pour suppression");
                    return NotFound(new { message = "Utilisateur non trouvé." });
                }

                Console.WriteLine($"Utilisateur trouvé: {user.Username} (ID: {id}, Rôle: {user.Role})");

                // Vérifier les dépendances avant suppression via le SERVICE
                var dependencies = await _userService.GetUserDependenciesAsync(id);
                if (dependencies != null && !dependencies.CanDelete)
                {
                    var reasons = new List<string>();

                    if (dependencies.StagiairesCount > 0)
                        reasons.Add($"{dependencies.StagiairesCount} stagiaire(s) assigné(s)");

                    if (dependencies.ProjectsCount > 0)
                        reasons.Add($"{dependencies.ProjectsCount} projet(s) assigné(s)");

                    Console.WriteLine($"Suppression bloquée pour l'utilisateur {id}: {string.Join(", ", reasons)}");

                    return BadRequest(new
                    {
                        message = "Impossible de supprimer cet utilisateur.",
                        reasons = reasons,
                        details = "Veuillez d'abord retirer les assignations avant de supprimer l'utilisateur."
                    });
                }

                // Procéder à la suppression
                await _userService.DeleteUserAsync(id);

                Console.WriteLine($"=== SUPPRESSION RÉUSSIE UTILISATEUR {id} ===");

                return Ok(new
                {
                    message = "Utilisateur supprimé avec succès.",
                    deletedUserId = id,
                    deletedUsername = user.Username
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"=== ERREUR SUPPRESSION UTILISATEUR {id} ===");
                Console.Error.WriteLine($"Message: {ex.Message}");
                Console.Error.WriteLine($"StackTrace: {ex.StackTrace}");

                if (ex.InnerException != null)
                {
                    Console.Error.WriteLine($"InnerException: {ex.InnerException.Message}");
                }

                // Retourner une erreur plus spécifique selon le type d'exception
                if (ex.Message.Contains("non trouvé"))
                {
                    return NotFound(new { message = ex.Message });
                }

                if (ex.Message.Contains("Impossible de supprimer") || ex.Message.Contains("assigné"))
                {
                    return BadRequest(new
                    {
                        message = ex.Message,
                        type = "ConstraintViolation"
                    });
                }

                // Pour les erreurs de base de données
                if (ex.Message.Contains("REFERENCE constraint") ||
                    ex.Message.Contains("FOREIGN KEY constraint") ||
                    ex.InnerException?.Message.Contains("constraint") == true)
                {
                    return BadRequest(new
                    {
                        message = "Impossible de supprimer cet utilisateur car il est référencé dans d'autres données. Veuillez d'abord supprimer ou modifier les données liées.",
                        type = "DatabaseConstraint",
                        details = "L'utilisateur est probablement assigné à des projets ou a des stagiaires assignés."
                    });
                }

                return StatusCode(500, new
                {
                    message = "Erreur interne du serveur lors de la suppression.",
                    details = ex.Message,
                    type = "InternalError"
                });
            }
        }

        // Endpoint pour vérifier les dépendances avant suppression
        [HttpGet("{id}/dependencies")]
        public async Task<IActionResult> GetUserDependencies(int id)
        {
            try
            {
                var dependencies = await _userService.GetUserDependenciesAsync(id);
                if (dependencies == null)
                {
                    return NotFound(new { message = "Utilisateur non trouvé." });
                }

                return Ok(dependencies);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de la vérification des dépendances pour l'utilisateur {id}: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
        }

        // Endpoint pour forcer la suppression (avec nettoyage des dépendances)
        [HttpDelete("{id}/force")]
        public async Task<IActionResult> ForceDeleteUser(int id)
        {
            try
            {
                Console.WriteLine($"=== SUPPRESSION FORCÉE UTILISATEUR {id} ===");

                var user = await _userService.GetUserByIdAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Utilisateur non trouvé." });
                }

                // Utiliser la méthode de suppression sécurisée qui gère les contraintes
                var success = await _userService.SafeDeleteUserAsync(id);

                if (success)
                {
                    Console.WriteLine($"=== SUPPRESSION FORCÉE RÉUSSIE UTILISATEUR {id} ===");
                    return Ok(new
                    {
                        message = "Utilisateur supprimé avec succès (avec nettoyage des dépendances).",
                        deletedUserId = id,
                        deletedUsername = user.Username
                    });
                }
                else
                {
                    return BadRequest(new { message = "Échec de la suppression forcée." });
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de la suppression forcée de l'utilisateur {id}: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("tuteur/{tuteurId}/stagiaires")]
        public async Task<IActionResult> GetStagiairesByTuteur(int tuteurId)
        {
            try
            {
                var stagiaires = await _userService.GetStagiairesByTuteurAsync(tuteurId);
                return Ok(stagiaires);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // GET: api/Users/stagiaires/sans-tuteur
        [HttpGet("stagiaires/sans-tuteur")]
        public async Task<IActionResult> GetStagiairesSansTuteur()
        {
            try
            {
                var stagiaires = await _userService.GetStagiairesSansTuteurAsync();
                return Ok(stagiaires);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Users/tuteur/{tuteurId}/stagiaires
        [HttpPost("tuteur/{tuteurId}/stagiaires")]
        public async Task<IActionResult> AffecterStagiaires(int tuteurId, [FromBody] List<int> stagiaireIds)
        {
            try
            {
                await _userService.AffecterStagiairesAsync(tuteurId, stagiaireIds);
                return Ok(new { message = "Stagiaires affectés avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/Users/stagiaires/{stagiaireId}/tuteur
        [HttpDelete("stagiaires/{stagiaireId}/tuteur")]
        public async Task<IActionResult> RetirerStagiaire(int stagiaireId)
        {
            try
            {
                await _userService.RetirerStagiaireAsync(stagiaireId);
                return Ok(new { message = "Stagiaire retiré du tuteur avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpGet("role/{role}")]
        public async Task<IActionResult> GetUsersByRole(string role)
        {
            try
            {
                var users = await _userService.GetUsersByRoleAsync(role);
                return Ok(users);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("projects/{projectId}/users")]
        public async Task<IActionResult> GetProjectUsers(int projectId)
        {
            try
            {
                var users = await _userService.GetProjectUsersAsync(projectId);

                // Ajoutez cette ligne pour examiner la structure
                Console.WriteLine($"Structure du premier utilisateur: {System.Text.Json.JsonSerializer.Serialize(users.FirstOrDefault())}");

                return Ok(users);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("projects/{projectId}/users")]
        public async Task<IActionResult> UpdateProjectUsers(int projectId, [FromBody] ProjectUserUpdateDto model)
        {
            try
            {
                var result = await _userService.UpdateProjectUsersAsync(projectId, model.UsersToAdd, model.UsersToRemove);
                if (result)
                    return Ok(new { message = "Utilisateurs du projet mis à jour avec succès" });
                else
                    return BadRequest(new { message = "Échec de la mise à jour des utilisateurs du projet" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }

        }


        [HttpPost("verify-password")]
        public async Task<IActionResult> VerifyPassword([FromBody] PasswordVerificationDto model)
        {
            try
            {
                bool isValid = await _userService.VerifyPasswordAsync(model.UserId, model.CurrentPassword);
                return Ok(isValid);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("external-login")]
        public async Task<IActionResult> ExternalLogin([FromBody] ExternalAuthDto externalAuth)
        {
            try
            {
                Console.WriteLine("------------- DÉBUT REQUÊTE EXTERNAL-LOGIN -------------");

                if (externalAuth == null)
                {
                    Console.WriteLine("Erreur: Le corps de la requête est null");
                    return BadRequest(new { message = "Le corps de la requête ne peut pas être vide" });
                }

                Console.WriteLine($"Provider reçu: {externalAuth.Provider}");
                Console.WriteLine($"Token reçu (longueur): {externalAuth.IdToken?.Length ?? 0}");

                if (string.IsNullOrEmpty(externalAuth.Provider) || string.IsNullOrEmpty(externalAuth.IdToken))
                {
                    Console.WriteLine("Erreur: Provider ou IdToken manquant");
                    return BadRequest(new { message = "Provider et IdToken sont requis" });
                }

                // Appeler le service d'authentification
                var result = await _userService.ExternalLoginAsync(externalAuth);

                Console.WriteLine("Authentification externe réussie, retour du token");
                Console.WriteLine("------------- FIN REQUÊTE EXTERNAL-LOGIN -------------");

                // Retourner la réponse complète avec le token JWT
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine("------------- ERREUR DANS EXTERNAL-LOGIN -------------");
                Console.WriteLine($"Exception dans ExternalLogin: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");

                if (ex.InnerException != null)
                {
                    Console.WriteLine($"InnerException: {ex.InnerException.Message}");
                    Console.WriteLine($"InnerException StackTrace: {ex.InnerException.StackTrace}");
                }

                Console.WriteLine("------------- FIN ERREUR EXTERNAL-LOGIN -------------");

                return BadRequest(new
                {
                    message = ex.Message,
                    innerError = ex.InnerException?.Message
                });
            }
        }

        [HttpPost("test-token")]
        public IActionResult TestToken([FromBody] ExternalAuthDto model)
        {
            try
            {
                if (model == null)
                    return BadRequest("Corps de requête vide");

                return Ok(new
                {
                    receivedProvider = model.Provider,
                    tokenFirstChars = model.IdToken?.Substring(0, Math.Min(20, model.IdToken?.Length ?? 0)),
                    tokenLength = model.IdToken?.Length ?? 0
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("external-login-simple")]
        public async Task<IActionResult> ExternalLoginSimple([FromBody] ExternalAuthDto externalAuth)
        {
            try
            {
                Console.WriteLine("Tentative d'authentification Google simplifiée");

                if (externalAuth == null)
                    return BadRequest(new { message = "Corps de requête vide" });

                var result = await _userService.ExternalLoginSimpleAsync(externalAuth);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur dans ExternalLoginSimple: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            try
            {
                if (string.IsNullOrEmpty(model.Email))
                {
                    return BadRequest(new { message = "L'email est requis" });
                }

                await _userService.SendPasswordResetEmailAsync(model.Email);

                // Pour des raisons de sécurité, retournez toujours un succès, même si l'email n'existe pas
                return Ok(new { message = "Si votre email existe dans notre système, vous recevrez un lien de réinitialisation." });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de la demande de réinitialisation: {ex.Message}");
                // Ne pas exposer l'erreur spécifique pour des raisons de sécurité
                return Ok(new { message = "Si votre email existe dans notre système, vous recevrez un lien de réinitialisation." });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            try
            {
                if (string.IsNullOrEmpty(model.Token) || string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.NewPassword))
                {
                    return BadRequest(new { message = "Tous les champs sont requis" });
                }

                bool result = await _userService.ResetPasswordAsync(model.Token, model.Email, model.NewPassword);

                if (result)
                {
                    return Ok(new { message = "Mot de passe réinitialisé avec succès" });
                }
                else
                {
                    return BadRequest(new { message = "Échec de la réinitialisation du mot de passe. Le lien est peut-être expiré ou invalide." });
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de la réinitialisation du mot de passe: {ex.Message}");
                return BadRequest(new { message = "Échec de la réinitialisation du mot de passe. " + ex.Message });
            }
        }

        [HttpGet("tuteur/{tuteurId}/stats")]
        public async Task<IActionResult> GetTuteurStats(int tuteurId)
        {
            try
            {
                var stagiaires = await _userService.GetStagiairesByTuteurAsync(tuteurId);
                var stagiairesCount = stagiaires.Count();

                int pendingReports = 0;
                int completedTasks = 0;

                // Si vous avez un service de rapports
                if (_reportService != null)
                {
                    var reports = await _reportService.GetReportsByTuteurAsync(tuteurId);
                    pendingReports = reports.Count(r => !r.IsApproved && !r.IsRejected);
                    completedTasks = reports.Count(r => r.IsApproved);
                }

                var stats = new
                {
                    stagiairesCount = stagiairesCount,
                    pendingReports = pendingReports,
                    completedTasks = completedTasks,
                    messages = 0 // À implémenter avec le service de messagerie
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }


        }

       
        [HttpGet("{userId}/activities")]
        public async Task<IActionResult> GetUserActivities(int userId)
        {
            try
            {
                // Pour l'instant, retournez des activités par défaut
                // Vous pouvez implémenter la vraie logique plus tard
                var activities = new[]
                {
            new { text = "Rapport évalué", time = "Il y a 2 heures", type = "completion" },
            new { text = "Nouveau stagiaire assigné", time = "Il y a 1 jour", type = "user" },
            new { text = "Message reçu", time = "Il y a 2 jours", type = "message" },
            new { text = "Document validé", time = "Il y a 3 jours", type = "document" }
        };

                return Ok(activities);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("stagiaires/completed-for-attestation")]
        public async Task<IActionResult> GetCompletedStagiairesForAttestation()
        {
            try
            {
                var completedStagiaires = await _userService.GetCompletedStagiairesForAttestationAsync();
                return Ok(completedStagiaires);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Users/{userId}/cv-info
        [HttpGet("{userId}/cv-info")]
        public async Task<IActionResult> GetUserCvInfo(int userId)
        {
            try
            {
                var cvInfo = await _userService.GetUserCvInfoAsync(userId);
                return Ok(cvInfo);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // PUT: api/Users/{userId}/skills
        [HttpPut("{userId}/skills")]
        public async Task<IActionResult> UpdateUserSkills(int userId, [FromBody] UpdateSkillsDto skillsDto)
        {
            try
            {
                if (skillsDto.UserId != userId)
                {
                    return BadRequest(new { message = "L'ID utilisateur ne correspond pas." });
                }

                var updatedUser = await _userService.UpdateUserSkillsAsync(userId, skillsDto.Skills);
                return Ok(new
                {
                    message = "Compétences mises à jour avec succès.",
                    skills = updatedUser.Skills
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Users/{userId}/cv
        [HttpPost("{userId}/cv")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadUserCv(int userId, [FromForm] IFormFile cvFile)
        {
            try
            {
                if (cvFile == null || cvFile.Length == 0)
                {
                    return BadRequest(new { message = "Aucun fichier CV fourni." });
                }

                var updatedUser = await _userService.UploadUserCvAsync(userId, cvFile);
                return Ok(new
                {
                    message = "CV uploadé avec succès.",
                    cvUrl = updatedUser.CvUrl,
                    originalFileName = updatedUser.CvOriginalFileName,
                    uploadedAt = updatedUser.CvUploadedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/Users/{userId}/cv
        [HttpDelete("{userId}/cv")]
        public async Task<IActionResult> DeleteUserCv(int userId)
        {
            try
            {
                var updatedUser = await _userService.DeleteUserCvAsync(userId);
                return Ok(new { message = "CV supprimé avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Users/{userId}/skills-simple (endpoint simplifié pour mettre à jour juste les skills)
        [HttpPut("{userId}/skills-simple")]
        public async Task<IActionResult> UpdateUserSkillsSimple(int userId, [FromBody] string skills)
        {
            try
            {
                var updatedUser = await _userService.UpdateUserSkillsAsync(userId, skills);
                return Ok(new
                {
                    message = "Compétences mises à jour avec succès.",
                    skills = updatedUser.Skills
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Users/{userId}/cv/download
        [HttpGet("{userId}/cv/download")]
        public async Task<IActionResult> DownloadUserCv(int userId)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(userId);

                if (string.IsNullOrEmpty(user.CvUrl))
                {
                    return NotFound(new { message = "Aucun CV trouvé pour cet utilisateur." });
                }

                // Construire le chemin physique du fichier
                var filePath = Path.Combine("wwwroot", user.CvUrl.TrimStart('/'));

                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { message = "Fichier CV non trouvé sur le serveur." });
                }

                // Déterminer le type de contenu basé sur l'extension
                var fileExtension = Path.GetExtension(filePath).ToLowerInvariant();
                string contentType = fileExtension switch
                {
                    ".pdf" => "application/pdf",
                    ".doc" => "application/msword",
                    ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    _ => "application/octet-stream"
                };

                // Lire le fichier et le retourner
                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                var fileName = user.CvOriginalFileName ?? $"cv_user_{userId}{fileExtension}";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Users/{userId}/profile-complete (pour mettre à jour skills + CV en une fois)
        [HttpPut("{userId}/profile-complete")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateCompleteProfile(int userId, [FromForm] CompleteProfileUpdateDto updateDto)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(userId);

                // Mettre à jour les skills si fournis
                if (!string.IsNullOrEmpty(updateDto.Skills))
                {
                    await _userService.UpdateUserSkillsAsync(userId, updateDto.Skills);
                }

                // Mettre à jour le CV si fourni
                if (updateDto.CvFile != null && updateDto.CvFile.Length > 0)
                {
                    await _userService.UploadUserCvAsync(userId, updateDto.CvFile);
                }

                // Récupérer l'utilisateur mis à jour
                var updatedUser = await _userService.GetUserByIdAsync(userId);

                return Ok(new
                {
                    message = "Profil mis à jour avec succès.",
                    skills = updatedUser.Skills,
                    cvUrl = updatedUser.CvUrl,
                    cvOriginalFileName = updatedUser.CvOriginalFileName,
                    cvUploadedAt = updatedUser.CvUploadedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère tous les stagiaires qui ne sont affectés à aucun projet
        /// </summary>
        [HttpGet("stagiaires/unassigned")]
        public async Task<IActionResult> GetUnassignedStagiaires()
        {
            try
            {
                var unassignedStagiaires = await _userService.GetUnassignedStagiairesAsync();
                return Ok(unassignedStagiaires);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Récupère tous les stagiaires disponibles pour être affectés à un projet spécifique
        /// (soit non affectés à aucun projet, soit non affectés à ce projet en particulier)
        /// </summary>
        [HttpGet("stagiaires/available-for-project/{projectId}")]
        public async Task<IActionResult> GetStagiairesAvailableForProject(int projectId)
        {
            try
            {
                // Option 1: Seulement les stagiaires jamais affectés à aucun projet
                var availableStagiaires = await _userService.GetUnassignedStagiairesAsync();

                // Option 2: Tous les stagiaires non affectés à CE projet (décommentez si vous préférez)
                // var availableStagiaires = await _userService.GetStagiairesNotInProjectAsync(projectId);

                return Ok(availableStagiaires);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


    }
}


