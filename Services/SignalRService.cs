using ElectronNET.API;
using Microsoft.AspNetCore.SignalR;
using ReHUD.Interfaces;
using SignalRChat.Hubs;

namespace ReHUD.Services
{
    public class SignalRService : ICommunicationService
    {
        private readonly IHubContext<ReHUDHub> _context;

        public SignalRService(IHubContext<ReHUDHub> hub) 
        {
            _context = hub;
        }

        public async Task Invoke(BrowserWindow? browserWindow, string channel)
        {
            await Invoke(browserWindow, channel, null);
        }

        public async Task Invoke(BrowserWindow? browserWindow, string channel, object? data)
        {
            await _context.Clients.Group(channel).SendAsync(channel, data);
            await _context.Clients.All.SendAsync(channel, data);
        }

        public async Task On(string channel, Action<object> listener)
        {
            await ReHUDHub.RegisterListeners(channel, listener);
        }

        public async Task Send(BrowserWindow? browserWindow, string channel, params object[]? data)
        {
            await _context.Clients.All.SendAsync(channel, data);
        }

    }
}
