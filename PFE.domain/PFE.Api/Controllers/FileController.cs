using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class FileController : ControllerBase
{
    private readonly IWebHostEnvironment _hostingEnvironment;

    public FileController(IWebHostEnvironment hostingEnvironment)
    {
        _hostingEnvironment = hostingEnvironment;
    }

    [HttpGet("pdf/{fileName}")]
    public IActionResult GetPdf(string fileName)
    {
        try
        {
            Console.WriteLine($"Tentative d'accès au fichier: {fileName}");

            // Chemin du fichier sans utiliser wwwroot
            // Utilisez le chemin complet de votre fichier
            var filePath = @"C:\Users\ASUS\Desktop\stage PFE\pfe\PFE.domain\PFE.Api\wwwroot\uploads\reports\23\ConventionStage_20250430_184603.pdf";

            Console.WriteLine($"Chemin complet: {filePath}");

            // Vérifier si le fichier existe
            if (!System.IO.File.Exists(filePath))
            {
                Console.WriteLine($"Le fichier n'existe pas: {filePath}");
                return NotFound();
            }

            // Lire le fichier en bytes
            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            Console.WriteLine($"Fichier lu avec succès, taille: {fileBytes.Length} bytes");

            // Renvoyer le fichier avec le type MIME approprié
            return File(fileBytes, "application/pdf");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception lors de l'accès au fichier: {ex.Message}");
            Console.WriteLine($"StackTrace: {ex.StackTrace}");
            return StatusCode(500, ex.Message);
        }
    }
}