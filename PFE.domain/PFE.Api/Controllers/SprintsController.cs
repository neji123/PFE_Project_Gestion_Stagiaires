using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;

namespace PFE.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
  //  [Authorize]
    public class SprintsController : ControllerBase
    {
        private readonly ISprintService _sprintService;

        public SprintsController(ISprintService sprintService)
        {
            _sprintService = sprintService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SprintDto>>> GetAllSprints()
        {
            try
            {
                var sprints = await _sprintService.GetAllSprintsAsync();
                return Ok(sprints);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SprintDto>> GetSprintById(int id)
        {
            try
            {
                var sprint = await _sprintService.GetSprintByIdAsync(id);
                return Ok(sprint);
            }
            catch (Exception ex)
            {
                return NotFound($"Sprint non trouvé: {ex.Message}");
            }
        }

        [HttpGet("project/{projectId}")]
        public async Task<ActionResult<IEnumerable<SprintDto>>> GetSprintsByProjectId(int projectId)
        {
            try
            {
                var sprints = await _sprintService.GetSprintsByProjectIdAsync(projectId);
                return Ok(sprints);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpPost]
       // [Authorize(Roles = "Admin,Tuteur")]
        public async Task<ActionResult<SprintDto>> CreateSprint(SprintCreateDto sprintDto)
        {
            try
            {
                var sprint = await _sprintService.CreateSprintAsync(sprintDto);
                return CreatedAtAction(nameof(GetSprintById), new { id = sprint.Id }, sprint);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erreur lors de la création du sprint: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
       // [Authorize(Roles = "Admin,Tuteur")]
        public async Task<IActionResult> UpdateSprint(int id, SprintUpdateDto sprintDto)
        {
            try
            {
                await _sprintService.UpdateSprintAsync(id, sprintDto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Sprint non trouvé: {ex.Message}");
            }
        }

        [HttpPatch("{id}/status")]
      //  [Authorize(Roles = "Admin,Tuteur,Stagiaire")]
        public async Task<IActionResult> UpdateSprintStatus(int id, SprintStatusUpdateDto statusDto)
        {
            try
            {
                await _sprintService.UpdateSprintStatusAsync(id, statusDto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Sprint non trouvé: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
      //  [Authorize(Roles = "Admin,Tuteur")]
        public async Task<IActionResult> DeleteSprint(int id)
        {
            try
            {
                await _sprintService.DeleteSprintAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Sprint non trouvé: {ex.Message}");
            }
        }
    }
}
