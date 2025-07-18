using System;
using System.Collections.Generic;

namespace PFE.domain.Entities
{
    public class RecommendationRequest
    {
        public int JobOfferId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string RequiredSkills { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public int TopN { get; set; } = 5;
    }

    public class RecommendationResponse
    {
        public bool Success { get; set; }
        public List<StagiaireRecommendation> Recommendations { get; set; } = new();
        public int TotalFound { get; set; }
        public string? Error { get; set; }
    }

    public class StagiaireRecommendation
    {
        public int StagiaireId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Skills { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string University { get; set; } = string.Empty;
        public string StagePeriod { get; set; } = string.Empty;
        public double Rating { get; set; }
        public double CompositeScore { get; set; }
        public double TextSimilarity { get; set; }
        public double SkillSimilarity { get; set; }
        public bool DepartmentMatch { get; set; }
        public List<string> MatchReasons { get; set; } = new();
    }
}
