using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
    public class ReportUploadDto
    {
        public int StagiaireId { get; set; }
        public int ReportTypeId { get; set; } // Changé de string à int
        public string Title { get; set; }
        public string Description { get; set; }
        public IFormFile File { get; set; }
    }
}
