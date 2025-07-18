using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.domain.Entities
{
    public class RecommendationRequest
    {
        [Required]
        public string Title { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        public string RequiredSkills { get; set; }

        public int? DepartmentId { get; set; }

        public int TopN { get; set; } = 5;
    }

    public class StagiaireRecommendation
    {
        public int StagiaireId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Skills { get; set; }
        public string Department { get; set; }
        public string University { get; set; }
        public string StagePeriod { get; set; }
        public double Rating { get; set; }
        public double CompositeScore { get; set; }
        public double TextSimilarity { get; set; }
        public double SkillSimilarity { get; set; }
        public bool DepartmentMatch { get; set; }
        public List<string> MatchReasons { get; set; } = new List<string>();
    }

    public class RecommendationResponse
    {
        public bool Success { get; set; }
        public List<StagiaireRecommendation> Recommendations { get; set; } = new List<StagiaireRecommendation>();
        public int TotalFound { get; set; }
        public string Error { get; set; }
    }
}
