using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
   public class ReportResubmitDto
    {
        public int StagiaireId { get; set; }
        public int ReportTypeId { get; set; } // 
        public string Title { get; set; }
        public string Description { get; set; }
        public IFormFile File { get; set; }
        public int RejectedReportId { get; set; }
    }
}
