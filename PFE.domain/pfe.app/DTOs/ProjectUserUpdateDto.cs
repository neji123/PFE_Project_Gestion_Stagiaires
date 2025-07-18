using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
    public class ProjectUserUpdateDto
    {
        public List<string> UsersToAdd { get; set; } = new List<string>();
        public List<string> UsersToRemove { get; set; } = new List<string>();
    }
}
