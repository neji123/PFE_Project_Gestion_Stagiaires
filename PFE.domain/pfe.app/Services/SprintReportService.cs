using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using PFE.domain.Entities;
using PFE.Application.Interfaces;
using PFE.Application.DTOs;
using TaskStatus = PFE.domain.Entities.TaskStatus;

namespace PFE.application.Services
{
    public class SprintReportService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SprintReportService> _logger;
        private readonly IUserRepository _userRepository;
        private readonly ISprintRepository _sprintRepository;
        private readonly ITaskRepository _taskRepository;
        private const string LatexApiUrl = "https://latex.ytotech.com/builds/sync";

        public SprintReportService(
            HttpClient httpClient,
            ILogger<SprintReportService> logger,
            IUserRepository userRepository,
            ISprintRepository sprintRepository,
            ITaskRepository taskRepository)
        {
            _httpClient = httpClient;
            _logger = logger;
            _userRepository = userRepository;
            _sprintRepository = sprintRepository;
            _taskRepository = taskRepository;
        }

        public async Task<byte[]> GenerateSprintReportPdf(int stagiaireId, SprintReportQuestionnaireDto? questionnaire = null)
        {
            try
            {
                _logger.LogInformation($"Generating sprint report for stagiaire ID: {stagiaireId}");

                // Récupérer les informations du stagiaire avec ses relations
                var stagiaire = await _userRepository.GetByIdAsync(stagiaireId);
                if (stagiaire == null || stagiaire.Role != UserRole.Stagiaire)
                {
                    throw new Exception("Stagiaire non trouvé");
                }

                // NOUVELLE LOGIQUE : Récupérer les sprints via les projets du stagiaire
                var stagiaireProjects = stagiaire.ProjectUsers?.Select(pu => pu.ProjectId).ToList() ?? new List<int>();

                _logger.LogInformation($"Stagiaire {stagiaireId} est assigné à {stagiaireProjects.Count} projet(s)");

                // Récupérer tous les sprints des projets du stagiaire
                var allSprints = new List<Sprint>();
                foreach (var projectId in stagiaireProjects)
                {
                    var projectSprints = await _sprintRepository.GetByProjectIdAsync(projectId);
                    allSprints.AddRange(projectSprints);
                }

                _logger.LogInformation($"Total sprints trouvés: {allSprints.Count}");

                // Récupérer toutes les tâches des sprints du stagiaire
                var allTasks = new List<ProjectTask>();
                foreach (var sprint in allSprints)
                {
                    var sprintTasks = await _taskRepository.GetBySprintIdAsync(sprint.Id);
                    allTasks.AddRange(sprintTasks);
                }

                _logger.LogInformation($"Total tâches trouvées: {allTasks.Count}");

                // Grouper les tâches par statut
                var todoTasks = allTasks.Where(t => t.Status == TaskStatus.Todo).ToList();
                var inProgressTasks = allTasks.Where(t => t.Status == TaskStatus.InProgress).ToList();
                var doneTasks = allTasks.Where(t => t.Status == TaskStatus.Done).ToList();

                // Grouper les sprints par statut
                var todoSprints = allSprints.Where(s => s.Status == SprintStatus.Todo).ToList();
                var inProgressSprints = allSprints.Where(s => s.Status == SprintStatus.InProgress).ToList();
                var doneSprints = allSprints.Where(s => s.Status == SprintStatus.Done).ToList();

                _logger.LogInformation($"Sprints par statut - Todo: {todoSprints.Count}, InProgress: {inProgressSprints.Count}, Done: {doneSprints.Count}");
                _logger.LogInformation($"Tâches par statut - Todo: {todoTasks.Count}, InProgress: {inProgressTasks.Count}, Done: {doneTasks.Count}");

                // Générer le contenu LaTeX avec le questionnaire
                string latexContent = GenerateReportLatexTemplate(
                    stagiaire,
                    todoSprints, inProgressSprints, doneSprints,
                    todoTasks, inProgressTasks, doneTasks,
                    questionnaire);

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
                _logger.LogError(ex, $"Error generating sprint report for stagiaire {stagiaireId}");
                throw;
            }
        }

        private string GenerateReportLatexTemplate(
            User stagiaire,
            List<Sprint> todoSprints, List<Sprint> inProgressSprints, List<Sprint> doneSprints,
            List<ProjectTask> todoTasks, List<ProjectTask> inProgressTasks, List<ProjectTask> doneTasks,
            SprintReportQuestionnaireDto? questionnaire = null)
        {
            string fullName = $"{stagiaire.FirstName} {stagiaire.LastName}";
            string departmentName = stagiaire.Department?.DepartmentName ?? "Non spécifié";
            string universityName = stagiaire.University?.Universityname ?? "Non spécifié";

            var sb = new StringBuilder();

            sb.AppendLine("\\documentclass[12pt,a4paper]{article}");
            sb.AppendLine("\\usepackage[T1]{fontenc}");
            sb.AppendLine("\\usepackage[french]{babel}");
            sb.AppendLine("\\usepackage{geometry}");
            sb.AppendLine("\\usepackage{graphicx}");
            sb.AppendLine("\\usepackage{microtype}");
            sb.AppendLine("\\usepackage{helvet}");
            sb.AppendLine("\\renewcommand{\\familydefault}{\\sfdefault}");
            sb.AppendLine("\\usepackage{fancyhdr}");
            sb.AppendLine("\\usepackage{xcolor}");
            sb.AppendLine("\\usepackage{tcolorbox}");
            sb.AppendLine("\\usepackage{enumitem}");
            sb.AppendLine();
            sb.AppendLine("\\geometry{a4paper, margin=2cm}");
            sb.AppendLine("\\pagestyle{fancy}");
            sb.AppendLine("\\fancyhf{}");
            sb.AppendLine("\\renewcommand{\\headrulewidth}{0.4pt}");
            sb.AppendLine("\\renewcommand{\\footrulewidth}{0.4pt}");
            sb.AppendLine("\\fancyhead[L]{Rapport de Sprint}");
            sb.AppendLine($"\\fancyhead[R]{{{fullName}}}");
            sb.AppendLine("\\fancyfoot[C]{\\thepage}");
            sb.AppendLine($"\\fancyfoot[R]{{{DateTime.Now:dd/MM/yyyy}}}");
            sb.AppendLine();
            sb.AppendLine("\\begin{document}");
            sb.AppendLine();

            // En-tête
            sb.AppendLine("\\begin{center}");
            sb.AppendLine("    \\rule{10cm}{2pt}");
            sb.AppendLine("    \\vspace{1cm}");
            sb.AppendLine("    {\\Large\\bfseries RAPPORT DE SPRINT}");
            sb.AppendLine("    \\vspace{0.5cm}");
            sb.AppendLine("    {\\large Suivi des activités de stage}");
            sb.AppendLine("\\end{center}");
            sb.AppendLine();
            sb.AppendLine("\\vspace{1cm}");
            sb.AppendLine();

            // Informations stagiaire
            sb.AppendLine("\\section*{Informations du stagiaire}");
            sb.AppendLine("\\begin{itemize}[leftmargin=2cm]");
            sb.AppendLine($"    \\item \\textbf{{Nom complet:}} {fullName}");
            sb.AppendLine($"    \\item \\textbf{{Département:}} {departmentName}");
            sb.AppendLine($"    \\item \\textbf{{Université:}} {universityName}");
            sb.AppendLine($"    \\item \\textbf{{Date du rapport:}} {DateTime.Now:dd/MM/yyyy}");
            sb.AppendLine("\\end{itemize}");
            sb.AppendLine();

            // NOUVELLE SECTION: Questionnaire de réflexion (si fourni)
            if (questionnaire != null &&
                (!string.IsNullOrWhiteSpace(questionnaire.Learnings) ||
                 !string.IsNullOrWhiteSpace(questionnaire.Skills) ||
                 !string.IsNullOrWhiteSpace(questionnaire.Difficulties)))
            {
                sb.AppendLine("\\section*{Réflexion personnelle}");
                sb.AppendLine();

                // Qu'ai-je appris ?
                if (!string.IsNullOrWhiteSpace(questionnaire.Learnings))
                {
                    sb.AppendLine("\\subsection*{Qu'ai-je appris ?}");
                    sb.AppendLine("\\begin{tcolorbox}[colback=blue!5!white,colframe=blue!75!black,title=Apprentissages]");
                    sb.AppendLine(EscapeLatex(questionnaire.Learnings));
                    sb.AppendLine("\\end{tcolorbox}");
                    sb.AppendLine();
                }

                // Compétences mobilisées
                if (!string.IsNullOrWhiteSpace(questionnaire.Skills))
                {
                    sb.AppendLine("\\subsection*{Compétences mobilisées}");
                    sb.AppendLine("\\begin{tcolorbox}[colback=green!5!white,colframe=green!75!black,title=Compétences utilisées]");
                    sb.AppendLine(EscapeLatex(questionnaire.Skills));
                    sb.AppendLine("\\end{tcolorbox}");
                    sb.AppendLine();
                }

                // Difficultés rencontrées et solutions
                if (!string.IsNullOrWhiteSpace(questionnaire.Difficulties))
                {
                    sb.AppendLine("\\subsection*{Difficultés rencontrées et solutions}");
                    sb.AppendLine("\\begin{tcolorbox}[colback=orange!5!white,colframe=orange!75!black,title=Défis et solutions]");
                    sb.AppendLine(EscapeLatex(questionnaire.Difficulties));
                    sb.AppendLine("\\end{tcolorbox}");
                    sb.AppendLine();
                }

                sb.AppendLine("\\newpage");
            }

            // Résumé général
            sb.AppendLine("\\section*{Résumé technique}");

            int totalSprints = todoSprints.Count + inProgressSprints.Count + doneSprints.Count;
            int totalTasks = todoTasks.Count + inProgressTasks.Count + doneTasks.Count;

            sb.AppendLine("\\begin{tcolorbox}[colback=blue!5!white,colframe=blue!75!black]");
            sb.AppendLine("\\begin{itemize}[leftmargin=2cm]");
            sb.AppendLine($"    \\item \\textbf{{Total des sprints:}} {totalSprints}");
            sb.AppendLine($"    \\item \\textbf{{Total des tâches:}} {totalTasks}");
            sb.AppendLine($"    \\item \\textbf{{Tâches terminées:}} {doneTasks.Count} ({(totalTasks > 0 ? (doneTasks.Count * 100.0 / totalTasks) : 0):F1}\\%)");
            sb.AppendLine($"    \\item \\textbf{{Tâches en cours:}} {inProgressTasks.Count}");
            sb.AppendLine($"    \\item \\textbf{{Tâches à faire:}} {todoTasks.Count}");
            sb.AppendLine("\\end{itemize}");
            sb.AppendLine("\\end{tcolorbox}");
            sb.AppendLine();

            // Section des sprints terminés
            if (doneSprints.Any())
            {
                sb.AppendLine("\\section*{Sprints terminés (Done)}");
                sb.AppendLine("\\begin{tcolorbox}[colback=green!5!white,colframe=green!75!black]");
                sb.AppendLine("\\begin{enumerate}[leftmargin=2cm]");
                foreach (var sprint in doneSprints)
                {
                    sb.AppendLine($"    \\item \\textbf{{{EscapeLatex(sprint.Name)}}}");
                    if (!string.IsNullOrEmpty(sprint.Description))
                        sb.AppendLine($"    \\\\ \\textit{{{EscapeLatex(sprint.Description)}}}");
                    sb.AppendLine($"    \\\\ Période: {sprint.StartDate:dd/MM/yyyy} - {sprint.EndDate:dd/MM/yyyy}");

                    var sprintTasks = doneTasks.Where(t => t.SprintId == sprint.Id).ToList();
                    if (sprintTasks.Any())
                    {
                        sb.AppendLine("    \\\\ Tâches associées:");
                        sb.AppendLine("    \\begin{itemize}");
                        foreach (var task in sprintTasks)
                        {
                            sb.AppendLine($"        \\item {EscapeLatex(task.Title)}");
                        }
                        sb.AppendLine("    \\end{itemize}");
                    }
                }
                sb.AppendLine("\\end{enumerate}");
                sb.AppendLine("\\end{tcolorbox}");
                sb.AppendLine();
            }

            // Section des sprints en cours
            if (inProgressSprints.Any())
            {
                sb.AppendLine("\\section*{Sprints en cours (In Progress)}");
                sb.AppendLine("\\begin{tcolorbox}[colback=orange!5!white,colframe=orange!75!black]");
                sb.AppendLine("\\begin{enumerate}[leftmargin=2cm]");
                foreach (var sprint in inProgressSprints)
                {
                    sb.AppendLine($"    \\item \\textbf{{{EscapeLatex(sprint.Name)}}}");
                    if (!string.IsNullOrEmpty(sprint.Description))
                        sb.AppendLine($"    \\\\ \\textit{{{EscapeLatex(sprint.Description)}}}");
                    sb.AppendLine($"    \\\\ Période: {sprint.StartDate:dd/MM/yyyy} - {sprint.EndDate:dd/MM/yyyy}");

                    var sprintTasks = inProgressTasks.Where(t => t.SprintId == sprint.Id).ToList();
                    if (sprintTasks.Any())
                    {
                        sb.AppendLine("    \\\\ Tâches associées:");
                        sb.AppendLine("    \\begin{itemize}");
                        foreach (var task in sprintTasks)
                        {
                            sb.AppendLine($"        \\item {EscapeLatex(task.Title)}");
                        }
                        sb.AppendLine("    \\end{itemize}");
                    }
                }
                sb.AppendLine("\\end{enumerate}");
                sb.AppendLine("\\end{tcolorbox}");
                sb.AppendLine();
            }

            // Section des sprints à faire
            if (todoSprints.Any())
            {
                sb.AppendLine("\\section*{Sprints planifiés (Todo)}");
                sb.AppendLine("\\begin{tcolorbox}[colback=gray!5!white,colframe=gray!75!black]");
                sb.AppendLine("\\begin{enumerate}[leftmargin=2cm]");
                foreach (var sprint in todoSprints)
                {
                    sb.AppendLine($"    \\item \\textbf{{{EscapeLatex(sprint.Name)}}}");
                    if (!string.IsNullOrEmpty(sprint.Description))
                        sb.AppendLine($"    \\\\ \\textit{{{EscapeLatex(sprint.Description)}}}");
                    sb.AppendLine($"    \\\\ Période prévue: {sprint.StartDate:dd/MM/yyyy} - {sprint.EndDate:dd/MM/yyyy}");

                    var sprintTasks = todoTasks.Where(t => t.SprintId == sprint.Id).ToList();
                    if (sprintTasks.Any())
                    {
                        sb.AppendLine("    \\\\ Tâches planifiées:");
                        sb.AppendLine("    \\begin{itemize}");
                        foreach (var task in sprintTasks)
                        {
                            sb.AppendLine($"        \\item {EscapeLatex(task.Title)}");
                        }
                        sb.AppendLine("    \\end{itemize}");
                    }
                }
                sb.AppendLine("\\end{enumerate}");
                sb.AppendLine("\\end{tcolorbox}");
                sb.AppendLine();
            }

            // Détail des tâches par statut
            sb.AppendLine("\\newpage");
            sb.AppendLine("\\section*{Détail des tâches}");

            // Tâches terminées
            if (doneTasks.Any())
            {
                sb.AppendLine("\\subsection*{Tâches terminées}");
                sb.AppendLine("\\begin{enumerate}[leftmargin=2cm]");
                foreach (var task in doneTasks.OrderBy(t => t.CreatedAt))
                {
                    sb.AppendLine($"    \\item \\textbf{{{EscapeLatex(task.Title)}}}");
                    if (!string.IsNullOrEmpty(task.Description))
                        sb.AppendLine($"    \\\\ {EscapeLatex(task.Description)}");
                    sb.AppendLine($"    \\\\ Créée le: {task.CreatedAt:dd/MM/yyyy}");
                    if (task.UpdatedAt.HasValue)
                        sb.AppendLine($"    \\\\ Terminée le: {task.UpdatedAt.Value:dd/MM/yyyy}");
                }
                sb.AppendLine("\\end{enumerate}");
                sb.AppendLine();
            }

            // Tâches en cours
            if (inProgressTasks.Any())
            {
                sb.AppendLine("\\subsection*{Tâches en cours}");
                sb.AppendLine("\\begin{enumerate}[leftmargin=2cm]");
                foreach (var task in inProgressTasks.OrderBy(t => t.CreatedAt))
                {
                    sb.AppendLine($"    \\item \\textbf{{{EscapeLatex(task.Title)}}}");
                    if (!string.IsNullOrEmpty(task.Description))
                        sb.AppendLine($"    \\\\ {EscapeLatex(task.Description)}");
                    sb.AppendLine($"    \\\\ Créée le: {task.CreatedAt:dd/MM/yyyy}");
                }
                sb.AppendLine("\\end{enumerate}");
                sb.AppendLine();
            }

            // Tâches à faire
            if (todoTasks.Any())
            {
                sb.AppendLine("\\subsection*{Tâches planifiées}");
                sb.AppendLine("\\begin{enumerate}[leftmargin=2cm]");
                foreach (var task in todoTasks.OrderBy(t => t.CreatedAt))
                {
                    sb.AppendLine($"    \\item \\textbf{{{EscapeLatex(task.Title)}}}");
                    if (!string.IsNullOrEmpty(task.Description))
                        sb.AppendLine($"    \\\\ {EscapeLatex(task.Description)}");
                    sb.AppendLine($"    \\\\ Créée le: {task.CreatedAt:dd/MM/yyyy}");
                }
                sb.AppendLine("\\end{enumerate}");
                sb.AppendLine();
            }

            sb.AppendLine("\\end{document}");

            return sb.ToString();
        }

        private string EscapeLatex(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";

            return text
                .Replace("\\", "\\textbackslash{}")
                .Replace("{", "\\{")
                .Replace("}", "\\}")
                .Replace("$", "\\$")
                .Replace("&", "\\&")
                .Replace("%", "\\%")
                .Replace("#", "\\#")
                .Replace("^", "\\textasciicircum{}")
                .Replace("_", "\\_")
                .Replace("~", "\\textasciitilde{}")
                .Replace("|", "\\textbar{}")
                .Replace("<", "\\textless{}")
                .Replace(">", "\\textgreater{}")
                .Replace("\r\n", "\\\\\n")
                .Replace("\n", "\\\\\n")
                .Replace("\r", "\\\\\n");
        }
    }
}