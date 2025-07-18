// PFE.Api.Controllers/ReportTypesController.cs
using Microsoft.AspNetCore.Mvc;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using System;
using System.Threading.Tasks;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportTypesController : ControllerBase
    {
        private readonly IReportTypeService _reportTypeService;

        public ReportTypesController(IReportTypeService reportTypeService)
        {
            _reportTypeService = reportTypeService;
        }

        // GET: api/ReportTypes
        [HttpGet]
        public async Task<IActionResult> GetAllReportTypes()
        {
            try
            {
                var reportTypes = await _reportTypeService.GetAllAsync();
                return Ok(reportTypes);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/ReportTypes/active
        [HttpGet("active")]
        public async Task<IActionResult> GetActiveReportTypes()
        {
            try
            {
                var reportTypes = await _reportTypeService.GetActiveAsync();
                return Ok(reportTypes);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/ReportTypes/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReportTypeById(int id)
        {
            try
            {
                var reportType = await _reportTypeService.GetByIdAsync(id);
                return Ok(reportType);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // POST: api/ReportTypes
        [HttpPost]
        public async Task<IActionResult> CreateReportType([FromBody] CreateReportTypeDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var reportType = await _reportTypeService.CreateAsync(createDto);
                return CreatedAtAction(nameof(GetReportTypeById), new { id = reportType.Id }, reportType);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/ReportTypes/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReportType(int id, [FromBody] UpdateReportTypeDto updateDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var reportType = await _reportTypeService.UpdateAsync(id, updateDto);
                return Ok(reportType);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/ReportTypes/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReportType(int id)
        {
            try
            {
                var result = await _reportTypeService.DeleteAsync(id);
                return Ok(new { success = result, message = "Type de rapport supprimé avec succès" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/ReportTypes/{id}/reorder
        [HttpPost("{id}/reorder")]
        public async Task<IActionResult> ReorderReportType(int id, [FromBody] ReorderDto reorderDto)
        {
            try
            {
                var result = await _reportTypeService.ReorderAsync(id, reorderDto.NewDisplayOrder);
                return Ok(new { success = result, message = "Ordre mis à jour avec succès" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/ReportTypes/initialize-defaults
        [HttpPost("initialize-defaults")]
        public async Task<IActionResult> InitializeDefaultReportTypes()
        {
            try
            {
                await _reportTypeService.InitializeDefaultReportTypesAsync();
                return Ok(new { message = "Types de rapports par défaut initialisés avec succès" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class ReorderDto
    {
        public int NewDisplayOrder { get; set; }
    }
}