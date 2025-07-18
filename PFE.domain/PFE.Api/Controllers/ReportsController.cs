// PFE.Api.Controllers/ReportsController.cs - Version mise à jour
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using PFE.Application.DTOs;
using PFE.Application.Interfaces;
using System;
using System.IO;
using System.Threading.Tasks;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportsController(IReportService reportService)
        {
            _reportService = reportService;
        }

        // POST: api/Reports/upload
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadReport([FromForm] ReportUploadDto uploadDto)
        {
            try
            {
                if (uploadDto.File == null || uploadDto.File.Length == 0)
                {
                    return BadRequest(new { message = "Aucun fichier n'a été fourni" });
                }

                // Validation du ReportTypeId
                if (uploadDto.ReportTypeId <= 0)
                {
                    return BadRequest(new { message = "Type de rapport invalide" });
                }

                var report = await _reportService.UploadReportAsync(uploadDto);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Reports/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReportById(int id)
        {
            try
            {
                var report = await _reportService.GetReportByIdAsync(id);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // GET: api/Reports/stagiaire/{stagiaireId}
        [HttpGet("stagiaire/{stagiaireId}")]
        public async Task<IActionResult> GetReportsByStagiaire(int stagiaireId)
        {
            try
            {
                var reports = await _reportService.GetReportsByStagiaireAsync(stagiaireId);
                return Ok(reports);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Reports/{reportId}/approve
        [HttpPost("{reportId}/approve")]
        public async Task<IActionResult> ApproveReport(int reportId, [FromBody] ApproveReportDto approveDto)
        {
            try
            {
                var report = await _reportService.ApproveReportAsync(reportId, approveDto.Feedback, approveDto.ApproverId);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Reports/{reportId}/reject
        [HttpPost("{reportId}/reject")]
        public async Task<IActionResult> RejectReport(int reportId, [FromBody] ApproveReportDto rejectDto)
        {
            try
            {
                var report = await _reportService.RejectReportAsync(reportId, rejectDto.Feedback, rejectDto.ApproverId);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Reports/resubmit
        [HttpPost("resubmit")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ResubmitReport([FromForm] ReportResubmitDto resubmitDto)
        {
            try
            {
                if (resubmitDto.File == null || resubmitDto.File.Length == 0)
                {
                    return BadRequest(new { message = "Aucun fichier n'a été fourni" });
                }

                // Validation du ReportTypeId
                if (resubmitDto.ReportTypeId <= 0)
                {
                    return BadRequest(new { message = "Type de rapport invalide" });
                }

                var report = await _reportService.ResubmitReportAsync(resubmitDto);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Reports/timeline/{stagiaireId}
        [HttpGet("timeline/{stagiaireId}")]
        public async Task<IActionResult> GetStagiaireTimeline(int stagiaireId)
        {
            try
            {
                var timeline = await _reportService.GetStagiaireTimelineAsync(stagiaireId);
                return Ok(timeline);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/Reports/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            try
            {
                var result = await _reportService.DeleteReportAsync(id);
                return Ok(new { success = result, message = "Rapport supprimé avec succès" });
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // GET: api/Reports/download-file/{stagiaireId}/{fileName}
        [HttpGet("download-file/{stagiaireId}/{fileName}")]
        public IActionResult DownloadFile(int stagiaireId, string fileName)
        {
            try
            {
                // Décodez le nom du fichier (peut contenir des caractères spéciaux)
                fileName = System.Net.WebUtility.UrlDecode(fileName);

                Console.WriteLine($"Tentative d'accès au fichier: stagiaireId={stagiaireId}, fileName={fileName}");

                // Construire le chemin du fichier
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "reports", stagiaireId.ToString());
                var filePath = Path.Combine(uploadsFolder, fileName);

                Console.WriteLine($"Chemin complet: {filePath}");

                // Vérifier si le dossier existe
                if (!Directory.Exists(uploadsFolder))
                {
                    Console.WriteLine($"Le dossier n'existe pas: {uploadsFolder}");
                    return NotFound(new { message = "Dossier de rapports non trouvé" });
                }

                // Vérifier si le fichier existe
                if (!System.IO.File.Exists(filePath))
                {
                    Console.WriteLine($"Le fichier n'existe pas: {filePath}");
                    return NotFound(new { message = "Fichier non trouvé" });
                }

                // Lire et renvoyer le fichier
                Console.WriteLine("Lecture du fichier...");
                var fileBytes = System.IO.File.ReadAllBytes(filePath);
                Console.WriteLine($"Fichier lu avec succès, taille: {fileBytes.Length} bytes");

                // Déterminer le type MIME
                var contentType = "application/pdf";

                return File(fileBytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception lors du téléchargement: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { message = $"Erreur lors de l'accès au fichier: {ex.Message}" });
            }
        }

        // GET: api/Reports/all
        [HttpGet("all")]
        public async Task<IActionResult> GetAllReports()
        {
            try
            {
                var reports = await _reportService.GetAllReportsAsync();
                return Ok(reports);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Reports/tuteur/{tuteurId}
        [HttpGet("tuteur/{tuteurId}")]
        public async Task<IActionResult> GetReportsByTuteur(int tuteurId)
        {
            try
            {
                var reports = await _reportService.GetReportsByTuteurAsync(tuteurId);
                return Ok(reports);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}