using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
 public class DepartmentDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Le nom du Department est obligatoire.")]
        [StringLength(100, ErrorMessage = "Le nom du Department ne peut pas dépasser 100 caractères.")]
        public string DepartmentName { get; set; }
    }
}
