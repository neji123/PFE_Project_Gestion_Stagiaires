using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
 public   class ExternalAuthDto
    {
        public string Provider { get; set; } // "google"
        public string IdToken { get; set; }  // Le jeton d'identification Google

    }
}
