using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using PFE.application.DTOs;

namespace PFE.application.Interfaces
{
    public interface INotificationService
    {
        Task<NotificationDto> GetNotificationByIdAsync(int id);
        Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId);
        Task<IEnumerable<NotificationDto>> GetUserUnreadNotificationsAsync(int userId);
        Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto createDto);
        Task MarkNotificationAsReadAsync(int notificationId);
        Task MarkAllNotificationsAsReadAsync(int userId);
        Task DeleteNotificationAsync(int notificationId);
        Task<int> GetUnreadNotificationsCountAsync(int userId);


    }
}