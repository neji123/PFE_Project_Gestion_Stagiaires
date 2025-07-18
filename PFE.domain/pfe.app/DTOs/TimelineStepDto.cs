using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
    public class TimelineStepDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public DateTime Date { get; set; }
        public bool IsCompleted { get; set; }
        public bool IsUpcoming { get; set; }
        public bool IsCurrent { get; set; }
        public string IconClass { get; set; }
        public int? ReportId { get; set; }
        public string ReportType { get; set; }
    }

    public class TimelineDto
    {
        public int StagiaireId { get; set; }
        public List<TimelineStepDto> Steps { get; set; }
    }
}
