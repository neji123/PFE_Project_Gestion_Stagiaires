using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Interfaces
{
  public  interface IEmailService
    {
        /// <summary>
        /// Envoie un email à l'adresse spécifiée
        /// </summary>
        /// <param name="to">Adresse email du destinataire</param>
        /// <param name="subject">Sujet de l'email</param>
        /// <param name="htmlBody">Corps de l'email en HTML</param>
        /// <returns>Task</returns>
        Task SendEmailAsync(string to, string subject, string htmlBody);
    }
}
