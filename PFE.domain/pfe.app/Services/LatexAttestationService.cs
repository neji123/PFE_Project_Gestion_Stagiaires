using Microsoft.Extensions.Logging;
using PFE.domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace PFE.application.Services
{
    public class LatexAttestationService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<LatexAttestationService> _logger;
        private const string LatexApiUrl = "https://latex.ytotech.com/builds/sync";

        public LatexAttestationService(HttpClient httpClient, ILogger<LatexAttestationService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<byte[]> GenerateAttestationPdf(string fullName, DateTime startDate, DateTime endDate)
        {
            try
            {
                _logger.LogInformation($"Generating LaTeX attestation for {fullName}, period: {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}");

                // Calculate the internship duration in days
                int durationInDays = (endDate - startDate).Days + 1;

                // Create a LaTeX document with the attestation template
                string latexContent = GenerateLatexTemplate(fullName, startDate, endDate, durationInDays);

                var requestContent = new
                {
                    compiler = "lualatex",
                    resources = new[]
                    {
                        new
                        {
                            main = true,
                            content = latexContent
                        }
                    }
                };

                var jsonContent = JsonSerializer.Serialize(requestContent);
                var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                // Send the request to the LaTeX compilation service
                var response = await _httpClient.PostAsync(LatexApiUrl, httpContent);

                if (response.IsSuccessStatusCode)
                {
                    // Return the PDF bytes
                    return await response.Content.ReadAsByteArrayAsync();
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"LaTeX compilation failed: {errorContent}");
                    throw new Exception($"LaTeX compilation failed with status code {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error generating LaTeX attestation for {fullName}");
                throw;
            }
        }

        private string GenerateLatexTemplate(string fullName, DateTime startDate, DateTime endDate, int durationInDays)
        {
            return "\\documentclass[12pt,a4paper]{article}\n" +
                // "\\usepackage[utf8]{inputenc}\n" + // Supprimé car inutile avec pdflatex ou xelatex
                "\\usepackage[T1]{fontenc}\n" +
                "\\usepackage[french]{babel}\n" +
                "\\usepackage{geometry}\n" +
                "\\usepackage{graphicx}\n" +
                "\\usepackage{microtype}\n" +
                "\\usepackage{helvet}\n" +
                "\\renewcommand{\\familydefault}{\\sfdefault}\n" +
                "\\usepackage{fancyhdr}\n" +
                "\\usepackage{xcolor}\n" +
                "\\usepackage{tcolorbox}\n" +
                "\n" +
                "\\geometry{a4paper, margin=2.5cm}\n" +
                "\\pagestyle{fancy}\n" +
                "\\fancyhf{}\n" +
                "\\renewcommand{\\headrulewidth}{0pt}\n" +
                "\\renewcommand{\\footrulewidth}{0.4pt}\n" +
                "\\fancyfoot[C]{\\thepage}\n" +
                "\\fancyfoot[L]{Entreprise XYZ}\n" +
                "\\fancyfoot[R]{" + DateTime.Now.ToString("dd/MM/yyyy") + "}\n" +
                "\n" +
                "\\begin{document}\n" +
                "\n" +
                "\\begin{center}\n" +
                "    % Logo placeholder - in production, you would include your actual logo\n" +
                "    \\rule{7cm}{2cm}\n" +
                "    \n" +
                "    \\vspace{1cm}\n" +
                "    \n" +
                "    {\\Large\\bfseries ATTESTATION DE STAGE}\n" +
                "    \n" +
                "    \\vspace{0.5cm}\n" +
                "    \n" +
                "    {\\large CERTIFICAT D'ACCOMPLISSEMENT}\n" +
                "\\end{center}\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent Référence: STG-" + DateTime.Now.Year + "-" + new Random().Next(1000, 9999) + " \\hfill Date: " + DateTime.Now.ToString("dd/MM/yyyy") + "\n" +
                "\n" +
                "\\vspace{2cm}\n" +
                "\n" +
                "\\noindent Nous, soussignés, certifions que:\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\begin{center}\n" +
                "    {\\Large\\bfseries " + fullName + "}\n" +
                "\\end{center}\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent A effectué un stage au sein de notre entreprise:\n" +
                "\n" +
                "\\vspace{0.5cm}\n" +
                "\n" +
                "\\begin{itemize}\n" +
                "    \\item \\textbf{Période:} Du " + startDate.ToString("dd/MM/yyyy") + " au " + endDate.ToString("dd/MM/yyyy") + "\n" +
                "    \\item \\textbf{Durée:} " + durationInDays + " jours\n" +
                "    \\item \\textbf{Département:} [Département]\n" +
                "    \\item \\textbf{Projet:} [Nom du Projet]\n" +
                "\\end{itemize}\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent Au cours de cette période, le/la stagiaire a participé activement aux travaux et projets qui lui ont été confiés. Il/Elle a fait preuve de professionnalisme, d'initiative et d'un grand sens des responsabilités.\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.\n" +
                "\n" +
                "\\vspace{2cm}\n" +
                "\n" +
                "\\begin{minipage}{0.48\\textwidth}\n" +
                "    \\textbf{Signature du Responsable:}\n" +
                "\n" +
                "    \\vspace{2cm}\n" +
                "\n" +
                "    \\rule{8cm}{0.4pt}\n" +
                "\n" +
                "    \\noindent Le Responsable \\\\\n" +
                "    \\textit{Titre / Position}\n" +
                "\\end{minipage}\n" +
                "\\hfill\n" +
                "\\begin{minipage}{0.48\\textwidth}\n" +
                "    \\textbf{Cachet de l'entreprise:}\n" +
                "\n" +
                "    \\vspace{2cm}\n" +
                "\n" +
                "    \\fbox{\\rule{8cm}{4cm}}\n" +
                "\\end{minipage}\n" +
                "\n" +
                "\\end{document}";
        }

        public async Task<byte[]> GenerateAttestationPdfForStagiaire(User stagiaire)
        {
            try
            {
                _logger.LogInformation($"Generating LaTeX attestation for stagiaire: {stagiaire.FirstName} {stagiaire.LastName}");

                if (!stagiaire.StartDate.HasValue || !stagiaire.EndDate.HasValue)
                {
                    throw new Exception("Les dates de début et de fin sont requises pour le stagiaire");
                }

                int durationInDays = (stagiaire.EndDate.Value - stagiaire.StartDate.Value).Days + 1;
                string latexContent = GenerateLatexTemplateForStagiaire(stagiaire, durationInDays);

                var requestContent = new
                {
                    compiler = "lualatex",
                    resources = new[]
                    {
                new
                {
                    main = true,
                    content = latexContent
                }
            }
                };

                var jsonContent = JsonSerializer.Serialize(requestContent);
                var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(LatexApiUrl, httpContent);

                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsByteArrayAsync();
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"LaTeX compilation failed: {errorContent}");
                    throw new Exception($"LaTeX compilation failed with status code {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error generating LaTeX attestation for stagiaire {stagiaire.FirstName} {stagiaire.LastName}");
                throw;
            }
        }

        private string GenerateLatexTemplateForStagiaire(User stagiaire, int durationInDays)
        {
            string fullName = $"{stagiaire.FirstName} {stagiaire.LastName}";
            string departmentName = stagiaire.Department?.DepartmentName ?? "[Département]";
            string universityName = stagiaire.University?.Universityname ?? "[Université]";
            string stageType = stagiaire.stage?.ToString()?.Replace("_", " ") ?? "[Type de stage]";
            string studentType = stagiaire.etudiant?.ToString() ?? "[Type d'étudiant]";

            return "\\documentclass[12pt,a4paper]{article}\n" +
                "\\usepackage[T1]{fontenc}\n" +
                "\\usepackage[french]{babel}\n" +
                "\\usepackage{geometry}\n" +
                "\\usepackage{graphicx}\n" +
                "\\usepackage{microtype}\n" +
                "\\usepackage{helvet}\n" +
                "\\renewcommand{\\familydefault}{\\sfdefault}\n" +
                "\\usepackage{fancyhdr}\n" +
                "\\usepackage{xcolor}\n" +
                "\\usepackage{tcolorbox}\n" +
                "\n" +
                "\\geometry{a4paper, margin=2.5cm}\n" +
                "\\pagestyle{fancy}\n" +
                "\\fancyhf{}\n" +
                "\\renewcommand{\\headrulewidth}{0pt}\n" +
                "\\renewcommand{\\footrulewidth}{0.4pt}\n" +
                "\\fancyfoot[C]{\\thepage}\n" +
                "\\fancyfoot[L]{Entreprise XYZ}\n" +
                "\\fancyfoot[R]{" + DateTime.Now.ToString("dd/MM/yyyy") + "}\n" +
                "\n" +
                "\\begin{document}\n" +
                "\n" +
                "\\begin{center}\n" +
                "    \\rule{7cm}{2cm}\n" +
                "    \\vspace{1cm}\n" +
                "    {\\Large\\bfseries ATTESTATION DE STAGE}\n" +
                "    \\vspace{0.5cm}\n" +
                "    {\\large CERTIFICAT D'ACCOMPLISSEMENT}\n" +
                "\\end{center}\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent Référence: STG-" + DateTime.Now.Year + "-" + new Random().Next(1000, 9999) + " \\hfill Date: " + DateTime.Now.ToString("dd/MM/yyyy") + "\n" +
                "\n" +
                "\\vspace{2cm}\n" +
                "\n" +
                "\\noindent Nous, soussignés, certifions que:\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\begin{center}\n" +
                "    {\\Large\\bfseries " + fullName + "}\n" +
                "\\end{center}\n" +
                "\n" +
                "\\vspace{0.5cm}\n" +
                "\n" +
                "\\begin{center}\n" +
                "    Étudiant(e) en " + studentType + " à " + universityName + "\n" +
                "\\end{center}\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent A effectué un " + stageType + " au sein de notre entreprise:\n" +
                "\n" +
                "\\vspace{0.5cm}\n" +
                "\n" +
                "\\begin{itemize}\n" +
                "    \\item \\textbf{Période:} Du " + stagiaire.StartDate.Value.ToString("dd/MM/yyyy") + " au " + stagiaire.EndDate.Value.ToString("dd/MM/yyyy") + "\n" +
                "    \\item \\textbf{Durée:} " + durationInDays + " jours\n" +
                "    \\item \\textbf{Département:} " + departmentName + "\n" +
                "    \\item \\textbf{Université:} " + universityName + "\n" +
                (stagiaire.Note.HasValue ? "    \\item \\textbf{Note obtenue:} " + stagiaire.Note.Value.ToString("F1") + "/20\n" : "") +
                "\\end{itemize}\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent Au cours de cette période, le/la stagiaire a participé activement aux travaux et projets qui lui ont été confiés. Il/Elle a fait preuve de professionnalisme, d'initiative et d'un grand sens des responsabilités.\n" +
                "\n" +
                "\\vspace{1cm}\n" +
                "\n" +
                "\\noindent Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.\n" +
                "\n" +
                "\\vspace{2cm}\n" +
                "\n" +
                "\\begin{minipage}{0.48\\textwidth}\n" +
                "    \\textbf{Signature du Responsable:}\n" +
                "    \\vspace{2cm}\n" +
                "    \\rule{8cm}{0.4pt}\n" +
                "    \\noindent Le Responsable \\\\\n" +
                "    \\textit{" + departmentName + "}\n" +
                "\\end{minipage}\n" +
                "\\hfill\n" +
                "\\begin{minipage}{0.48\\textwidth}\n" +
                "    \\textbf{Cachet de l'entreprise:}\n" +
                "    \\vspace{2cm}\n" +
                "    \\fbox{\\rule{8cm}{4cm}}\n" +
                "\\end{minipage}\n" +
                "\n" +
                "\\end{document}";
        }

    }
}