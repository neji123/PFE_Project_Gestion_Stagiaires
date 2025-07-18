using Microsoft.Extensions.Configuration;
using PFE.application.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace PFE.application.Services
{
 public   class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly string _smtpServer;
        private readonly int _smtpPort;
        private readonly string _smtpUsername;
        private readonly string _smtpPassword;
        private readonly string _fromEmail;
        private readonly string _fromName;
        private readonly bool _enableSsl;

        public SmtpEmailService(IConfiguration configuration)
        {
            _configuration = configuration;

            _smtpServer = _configuration["EmailSettings:SmtpServer"];
            _smtpPort = int.Parse(_configuration["EmailSettings:SmtpPort"]);
            _smtpUsername = _configuration["EmailSettings:SmtpUsername"];
            _smtpPassword = _configuration["EmailSettings:SmtpPassword"];
            _fromEmail = _configuration["EmailSettings:FromEmail"];
            _fromName = _configuration["EmailSettings:FromName"];
            _enableSsl = bool.Parse(_configuration["EmailSettings:EnableSsl"]);
        }

        public async Task SendEmailAsync(string to, string subject, string htmlBody)
        {
            try
            {
                using (var client = new SmtpClient(_smtpServer, _smtpPort))
                {
                    client.UseDefaultCredentials = false;
                    client.Credentials = new NetworkCredential(_smtpUsername, _smtpPassword);
                    client.EnableSsl = _enableSsl;

                    var message = new MailMessage
                    {
                        From = new MailAddress(_fromEmail, _fromName),
                        Subject = subject,
                        Body = htmlBody,
                        IsBodyHtml = true
                    };

                    message.To.Add(to);

                    await client.SendMailAsync(message);
                    Console.WriteLine($"Email envoyé à {to} avec succès.");
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de l'envoi de l'email: {ex.Message}");
                throw;
            }
        }
    }
}
