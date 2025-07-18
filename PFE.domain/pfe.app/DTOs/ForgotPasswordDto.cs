using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.DTOs
{
 
        public class ForgotPasswordDto
        {
            [Required(ErrorMessage = "L'email est requis")]
            [EmailAddress(ErrorMessage = "Format d'email invalide")]
            public string Email { get; set; } = string.Empty;
        }

        public class ResetPasswordDto
        {
            [Required(ErrorMessage = "Le token est requis")]
            public string Token { get; set; } = string.Empty;

            [Required(ErrorMessage = "L'email est requis")]
            [EmailAddress(ErrorMessage = "Format d'email invalide")]
            public string Email { get; set; } = string.Empty;

            [Required(ErrorMessage = "Le nouveau mot de passe est requis")]
            [MinLength(8, ErrorMessage = "Le mot de passe doit contenir au moins 8 caractères")]
            public string NewPassword { get; set; } = string.Empty;
        }
    }

