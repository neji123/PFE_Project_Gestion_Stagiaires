using Microsoft.AspNetCore.Mvc;
using PFE.application.Interfaces;
using PFE.Application.Interfaces;

[ApiController]
[Route("api/[controller]")]
public class PdfController : ControllerBase
{
    private readonly IReportRepository _reportRepository;

    public PdfController(IReportRepository reportRepository)
    {
        _reportRepository = reportRepository;
    }

    [HttpGet("getReport/{reportId}")]
    public async Task<IActionResult> GetReportById(int reportId)
    {
        try
        {
            var report = await _reportRepository.GetByIdAsync(reportId);
            if (report == null)
            {
                Console.WriteLine($"Rapport non trouvé: ID={reportId}");
                return NotFound("Rapport non trouvé");
            }

            string filePath = report.FilePath;
            Console.WriteLine($"Chemin du fichier: {filePath}");

            if (!System.IO.File.Exists(filePath))
            {
                Console.WriteLine($"Fichier non trouvé sur le disque: {filePath}");
                return NotFound("Fichier non trouvé");
            }

            // Lire le fichier en bytes
            byte[] fileBytes = System.IO.File.ReadAllBytes(filePath);
            Console.WriteLine($"Fichier lu avec succès: {fileBytes.Length} bytes");

            // Extraire le nom du fichier
            string fileName = Path.GetFileName(filePath);

            // Retourner comme contenu binaire avec le type MIME PDF
            return File(fileBytes, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERREUR: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, $"Erreur: {ex.Message}");
        }
    }
}