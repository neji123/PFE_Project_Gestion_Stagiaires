using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;

namespace PFE.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
   // [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectDto>>> GetAllProjects()
        {
            try
            {
                var projects = await _projectService.GetAllProjectsAsync();
                return Ok(projects);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProjectDto>> GetProjectById(int id)
        {
            try
            {
                var project = await _projectService.GetProjectByIdAsync(id);
                return Ok(project);
            }
            catch (Exception ex)
            {
                return NotFound($"Projet non trouvé: {ex.Message}");
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjectsForUser(int userId)
        {
            try
            {
                var projects = await _projectService.GetProjectsForUserAsync(userId);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpPost]
      //  [Authorize(Roles = "Admin,Tuteur,RHs")]
        public async Task<ActionResult<ProjectDto>> CreateProject([FromForm] ProjectCreateDto projectDto)
        {
            try
            {
                var project = await _projectService.CreateProjectAsync(projectDto);
                return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, project);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erreur lors de la création du projet: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
      //  [Authorize(Roles = "Admin,Tuteur,RHs")]
        public async Task<IActionResult> UpdateProject(int id, [FromForm] ProjectUpdateDto projectDto)
        {
            try
            {
                await _projectService.UpdateProjectAsync(id, projectDto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Projet non trouvé: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
     //   [Authorize(Roles = "Admin,RHs")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            try
            {
                await _projectService.DeleteProjectAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Projet non trouvé: {ex.Message}");
            }
        }

        [HttpPost("{projectId}/users")]
      //  [Authorize(Roles = "Admin,Tuteur,RHs")]
        public async Task<IActionResult> AssignUsersToProject(int projectId, [FromBody] List<int> userIds)
        {
            try
            {
                await _projectService.AssignUsersToProjectAsync(projectId, userIds);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest($"Erreur lors de l'assignation des utilisateurs: {ex.Message}");
            }
        }

        [HttpDelete("{projectId}/users/{userId}")]
      //  [Authorize(Roles = "Admin,Tuteur,RHs")]
        public async Task<IActionResult> RemoveUserFromProject(int projectId, int userId)
        {
            try
            {
                await _projectService.RemoveUserFromProjectAsync(projectId, userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest($"Erreur lors du retrait de l'utilisateur: {ex.Message}");
            }
        }

        [HttpGet("user/projects")]
        [Authorize]
        public async Task<IActionResult> GetUserProjects()
        {
            try
            {
                // Récupérer l'ID de l'utilisateur depuis le token JWT
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Utilisateur non identifié ou ID invalide" });
                }

                // Utiliser le service pour récupérer les projets de l'utilisateur
                var projects = await _projectService.GetUserProjectsAsync(userId);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


    }
}
