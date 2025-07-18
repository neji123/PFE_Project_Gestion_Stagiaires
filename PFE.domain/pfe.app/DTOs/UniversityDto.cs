using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
   public class UniversityDto
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Le nom de l'université est obligatoire.")]
        [StringLength(100, ErrorMessage = "Le nom de l'université ne peut pas dépasser 100 caractères.")]
        public string Universityname { get; set; }
    }
}
