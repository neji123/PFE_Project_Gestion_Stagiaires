using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PFE.application.DTOs;
using PFE.application.Interfaces;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PFE.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // S'assure que seuls les utilisateurs authentifiés peuvent accéder
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        // Obtenir toutes les notifications de l'utilisateur connecté
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationDto>>> GetMyNotifications()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var notifications = await _notificationService.GetUserNotificationsAsync(userId);
            return Ok(notifications);
        }

        // Obtenir uniquement les notifications non lues
        [HttpGet("unread")]
        public async Task<ActionResult<IEnumerable<NotificationDto>>> GetMyUnreadNotifications()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var notifications = await _notificationService.GetUserUnreadNotificationsAsync(userId);
            return Ok(notifications);
        }

        // Obtenir le nombre de notifications non lues
        [HttpGet("unread/count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var count = await _notificationService.GetUnreadNotificationsCountAsync(userId);
            return Ok(count);
        }

        // Obtenir une notification spécifique par ID
        [HttpGet("{id}")]
        public async Task<ActionResult<NotificationDto>> GetNotification(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var notification = await _notificationService.GetNotificationByIdAsync(id);

            if (notification == null)
                return NotFound();

            // Vérifier que la notification appartient bien à l'utilisateur connecté
            if (notification.UserId != userId)
                return Forbid();

            return Ok(notification);
        }

        // Marquer une notification comme lue
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var notification = await _notificationService.GetNotificationByIdAsync(id);

            if (notification == null)
                return NotFound();

            // Vérifier que la notification appartient bien à l'utilisateur connecté
            if (notification.UserId != userId)
                return Forbid();

            await _notificationService.MarkNotificationAsReadAsync(id);
            return NoContent();
        }

        // Marquer toutes les notifications de l'utilisateur comme lues
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            await _notificationService.MarkAllNotificationsAsReadAsync(userId);
            return NoContent();
        }

        // Supprimer une notification
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var notification = await _notificationService.GetNotificationByIdAsync(id);

            if (notification == null)
                return NotFound();

            // Vérifier que la notification appartient bien à l'utilisateur connecté
            if (notification.UserId != userId)
                return Forbid();

            await _notificationService.DeleteNotificationAsync(id);
            return NoContent();
        }

        // Endpoint pour les administrateurs pour créer des notifications pour d'autres utilisateurs
        [HttpPost]
        [Authorize(Roles = "Admin,RH")] // Seuls les admins et RHs peuvent créer des notifications
        public async Task<ActionResult<NotificationDto>> CreateNotification(CreateNotificationDto createDto)
        {
            var notification = await _notificationService.CreateNotificationAsync(createDto);
            return CreatedAtAction(nameof(GetNotification), new { id = notification.Id }, notification);
        }
    }
}