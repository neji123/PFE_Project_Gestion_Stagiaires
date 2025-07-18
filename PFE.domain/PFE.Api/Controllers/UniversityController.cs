using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;

namespace PFE.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
   // [Authorize] // Add appropriate authorization as needed
    public class UniversityController : ControllerBase
    {
        private readonly IUniversityService _universityService;

        public UniversityController(IUniversityService universityService)
        {
            _universityService = universityService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUniversities()
        {
            var universities = await _universityService.GetAllUniversitiesAsync();
            return Ok(universities);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUniversityById(int id)
        {
            var university = await _universityService.GetUniversityByIdAsync(id);

            if (university == null)
                return NotFound();

            return Ok(university);
        }

        [HttpPost]
       // [Authorize(Roles = "Admin,RHs")] // Only allow admins and HR to create universities
        public async Task<IActionResult> CreateUniversity([FromBody] UniversityDto universityDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _universityService.CreateUniversityAsync(universityDto);
                return CreatedAtAction(nameof(GetUniversityById), new { id = result.Id }, result);
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
       // [Authorize(Roles = "Admin,RHs")] // Only allow admins and HR to update universities
        public async Task<IActionResult> UpdateUniversity(int id, [FromBody] UniversityDto universityDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _universityService.UpdateUniversityAsync(id, universityDto);
                return Ok(result);
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
       // [Authorize(Roles = "Admin,RHs")] // Only allow admins and HR to delete universities
        public async Task<IActionResult> DeleteUniversity(int id)
        {
            var result = await _universityService.DeleteUniversityAsync(id);

            if (!result)
                return NotFound();

            return NoContent();
        }
    }
}
