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
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetAllTasks()
        {
            try
            {
                var tasks = await _taskService.GetAllTasksAsync();
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskDto>> GetTaskById(int id)
        {
            try
            {
                var task = await _taskService.GetTaskByIdAsync(id);
                return Ok(task);
            }
            catch (Exception ex)
            {
                return NotFound($"Tâche non trouvée: {ex.Message}");
            }
        }

        [HttpGet("sprint/{sprintId}")]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasksBySprintId(int sprintId)
        {
            try
            {
                var tasks = await _taskService.GetTasksBySprintIdAsync(sprintId);
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasksAssignedToUser(int userId)
        {
            try
            {
                var tasks = await _taskService.GetTasksAssignedToUserAsync(userId);
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur: {ex.Message}");
            }
        }

        [HttpPost]
     //   [Authorize(Roles = "Admin,Tuteur")]
        public async Task<ActionResult<TaskDto>> CreateTask(TaskCreateDto taskDto)
        {
            try
            {
                var task = await _taskService.CreateTaskAsync(taskDto);
                return CreatedAtAction(nameof(GetTaskById), new { id = task.Id }, task);
            }
            catch (Exception ex)
            {
                return BadRequest($"Erreur lors de la création de la tâche: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
      //  [Authorize(Roles = "Admin,Tuteur,Stagiaire")]
        public async Task<IActionResult> UpdateTask(int id, TaskUpdateDto taskDto)
        {
            try
            {
                await _taskService.UpdateTaskAsync(id, taskDto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Tâche non trouvée: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
     //   [Authorize(Roles = "Admin,Tuteur")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            try
            {
                await _taskService.DeleteTaskAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return NotFound($"Tâche non trouvée: {ex.Message}");
            }
        }
    }
}
