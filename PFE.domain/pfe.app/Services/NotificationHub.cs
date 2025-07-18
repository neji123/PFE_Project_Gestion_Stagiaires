using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Threading.Tasks;
using System;
namespace PFE.application.Services
{
  
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var user = Context.User;
            if (user != null)
            {
                var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var role = user.FindFirst(ClaimTypes.Role)?.Value;

                if (!string.IsNullOrEmpty(userId))
                {
                    // Associer la connexion à l'utilisateur pour pouvoir lui envoyer des messages privés
                    await Groups.AddToGroupAsync(Context.ConnectionId, userId);
                }

                if (!string.IsNullOrEmpty(role))
                {
                    // Ajouter l'utilisateur au groupe correspondant à son rôle
                    if (role == "Admin")
                    {
                        // Si l'utilisateur est Admin, ajouter au groupe Admins
                        await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
                    }
                    else if (role == "RHs")
                    {
                        // Si l'utilisateur est RH, ajouter au groupe RHs
                        await Groups.AddToGroupAsync(Context.ConnectionId, "RHs");
                    }
                }
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var user = Context.User;
            if (user != null)
            {
                var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var role = user.FindFirst(ClaimTypes.Role)?.Value;

                if (!string.IsNullOrEmpty(userId))
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
                }

                if (!string.IsNullOrEmpty(role))
                {
                    // Retirer l'utilisateur du groupe correspondant à son rôle
                    if (role == "Admin")
                    {
                        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "Admins");
                    }
                    else if (role == "RHs")
                    {
                        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "RHs");
                    }
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Méthode pour permettre aux clients de rejoindre des groupes
        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        }

        // Méthode pour permettre aux clients de quitter des groupes
        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }

        // Méthode pour envoyer un message à un groupe spécifique
        public async Task SendToGroup(string groupName, string message)
        {
            await Clients.Group(groupName).SendAsync("ReceiveNotification", message);
        }

        // Méthode pour envoyer un message à un utilisateur spécifique
        public async Task SendToUser(string userId, string message)
        {
            await Clients.User(userId).SendAsync("ReceiveNotification", message);
        }

        // Méthode pour envoyer un message à plusieurs groupes simultanément
        public async Task SendToGroups(string[] groupNames, string message)
        {
            foreach (var groupName in groupNames)
            {
                await Clients.Group(groupName).SendAsync("ReceiveNotification", message);
            }
        }
    }
}