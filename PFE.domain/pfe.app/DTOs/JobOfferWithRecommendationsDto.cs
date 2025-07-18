namespace PFE.application.DTOs
{
    public class StagiaireRecommendationDto
    {
        public int Id { get; set; }
        public int StagiaireId { get; set; }
        public string StagiaireEmail { get; set; } = string.Empty;
        public string StagiaireeName { get; set; } = string.Empty;
        public string Skills { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string University { get; set; } = string.Empty;
        public double CompositeScore { get; set; }
        public double SkillSimilarity { get; set; }
        public double TextSimilarity { get; set; }
        public bool DepartmentMatch { get; set; }
        public int RecommendationRank { get; set; }
        public List<string> MatchReasons { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
        public bool IsViewed { get; set; }
        public bool IsContacted { get; set; }
        public bool IsSelected { get; set; }
        public string? Notes { get; set; }
    }

    public class JobOfferWithRecommendationsDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequiredSkills { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public DateTime PublishedAt { get; set; }
        public bool RecommendationsGenerated { get; set; }
        public DateTime? LastRecommendationGeneratedAt { get; set; }
        public int RecommendationCount { get; set; }
        public List<StagiaireRecommendationDto> Recommendations { get; set; } = new();
    }

    public class GenerateRecommendationsRequest
    {
        public int JobOfferId { get; set; }
        public int TopN { get; set; } = 5;
        public bool RegenerateIfExists { get; set; } = false;
    }

    public class UpdateRecommendationStatusRequest
    {
        public int RecommendationId { get; set; }
        public bool? IsViewed { get; set; }
        public bool? IsContacted { get; set; }
        public bool? IsSelected { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateJobOfferWithRecommendationsRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequiredSkills { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public bool GenerateRecommendations { get; set; } = true;
        public int TopN { get; set; } = 5;
    }
}