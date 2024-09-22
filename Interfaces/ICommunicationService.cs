using ElectronNET.API;

namespace ReHUD.Interfaces
{
    public interface ICommunicationService
    {
        // On, Invoke, Send, etc.
        public Task On(string channel, Action<object> listener);
        public Task Invoke(BrowserWindow? browserWindow, string channel);
        public Task Invoke(BrowserWindow? browserWindow, string channel, object? data);
        public Task Send(BrowserWindow? browserWindow, string channel, params object[] data);
    }
}
