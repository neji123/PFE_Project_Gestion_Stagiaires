using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
   public class PasswordVerificationDto
    {
        public int UserId { get; set; }
        public string CurrentPassword { get; set; }
    }
}
