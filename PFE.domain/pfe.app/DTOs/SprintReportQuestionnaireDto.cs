namespace PFE.Application.DTOs
{
    public class SprintReportQuestionnaireDto
    {
        public string Learnings { get; set; } = string.Empty;
        public string Skills { get; set; } = string.Empty;
        public string Difficulties { get; set; } = string.Empty;
    }

    public class SprintReportRequestDto
    {
        public SprintReportQuestionnaireDto? Questionnaire { get; set; }
    }
}