using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using PFE.application.DTOs;

using PFE.application.Interfaces;
using PFE.domain.Entities;


namespace PFE.application.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(
            INotificationRepository notificationRepository,
            IHubContext<NotificationHub> hubContext)
        {
            _notificationRepository = notificationRepository;
            _hubContext = hubContext;
        }

        public async Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto createDto)
        {
            // Mappage manuel de CreateNotificationDto vers Notification
            var notification = new Notification
            {
                Title = createDto.Title,
                Message = createDto.Message,
                Type = createDto.Type,
                UserId = createDto.UserId,
                RelatedEntityId = createDto.RelatedEntityId,
                Status = NotificationStatus.Unread,
                CreatedAt = DateTime.UtcNow
            };

            notification = await _notificationRepository.AddAsync(notification);

            // Mappage manuel vers DTO pour le retour
            var notificationDto = MapToDto(notification);

            // Envoi de la notification en temps réel
            await _hubContext.Clients.User(createDto.UserId.ToString())
                .SendAsync("ReceiveNotification", notificationDto);

            return notificationDto;
        }

        public async Task DeleteNotificationAsync(int notificationId)
        {
            await _notificationRepository.DeleteAsync(notificationId);
        }

        public async Task<NotificationDto> GetNotificationByIdAsync(int id)
        {
            var notification = await _notificationRepository.GetByIdAsync(id);
            return notification == null ? null : MapToDto(notification);
        }

        public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId)
        {
            var notifications = await _notificationRepository.GetByUserIdAsync(userId);
            return notifications.Select(MapToDto);
        }

        public async Task<IEnumerable<NotificationDto>> GetUserUnreadNotificationsAsync(int userId)
        {
            var notifications = await _notificationRepository.GetUnreadByUserIdAsync(userId);
            return notifications.Select(MapToDto);
        }

        public async Task MarkAllNotificationsAsReadAsync(int userId)
        {
            await _notificationRepository.MarkAllAsReadAsync(userId);
        }

        public async Task MarkNotificationAsReadAsync(int notificationId)
        {
            await _notificationRepository.MarkAsReadAsync(notificationId);
        }

        // Méthode helper pour le mappage vers DTO
        private static NotificationDto MapToDto(Notification notification)
        {
            return new NotificationDto
            {
                Id = notification.Id,
                Title = notification.Title,
                Message = notification.Message,
                Type = notification.Type.ToString(),
                Status = notification.Status.ToString(),
                CreatedAt = notification.CreatedAt,
                UserId = notification.UserId,
                RelatedEntityId = notification.RelatedEntityId
            };
        }



        public async Task<int> GetUnreadNotificationsCountAsync(int userId)
        {
            var notifications = await _notificationRepository.GetUnreadByUserIdAsync(userId);
            return notifications.Count();
        }

    }
}
