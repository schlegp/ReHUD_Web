using Microsoft.AspNetCore.SignalR;
using ReHUD;
using ReHUD.Interfaces;
using System.Collections.Concurrent;
using System.Data;
using System.Reflection;

namespace SignalRChat.Hubs
{
    public class ReHUDHub : Hub
    {
        private static List<string> ConnectedIds = [];

        private static Dictionary<string, List<Action<object>>> Listeners = InitializeListeners();

        private static Dictionary<string, List<Action<object>>> InitializeListeners()
        {
            var methods = typeof(ReHUDHub).GetMethods().Select(SelectName);
            var dict = new Dictionary<string, List<Action<object>>> ();
            foreach (var method in methods)
            {
                dict.Add(method, []);
            }
            return dict;
        }

        public void Log(string level, double startTimestamp, double endTimestamp, string message) {
            try {
                if (startTimestamp != -1) {
                    startTimestamp /= 1000;
                }
                if (endTimestamp != -1) {
                    endTimestamp /= 1000;
                }

                LogMessage logMessage = new(startTimestamp, endTimestamp, message);
                if (Startup.logger != null) {
                    switch (level) {
                        case "WARN":
                            Startup.logger.Warn(logMessage);
                            break;
                        case "ERROR":
                            Startup.logger.Error(logMessage);
                            break;
                        default:
                            Startup.logger.Info(logMessage);
                            break;
                    }
                }
            }
            catch (Exception e) {
                Console.WriteLine(e);
            }
        }

        public override Task OnConnectedAsync()
        {
            ConnectedIds.Add(Context.ConnectionId);
            Console.WriteLine($"Connections: {ConnectedIds.Count}");
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            ConnectedIds.Remove(Context.ConnectionId);
            Console.WriteLine($"Connections: {ConnectedIds.Count}");
            return base.OnDisconnectedAsync(exception);
        }

        private IR3EDataService? GetR3EDataService()
        {
            return Context.GetHttpContext()?.RequestServices.GetService<IR3EDataService>();
        }

        public void SaveBestLap(int layoutId, int classId, double laptime, double[] points, double pointsPerMeter)
        {
            Startup.logger.InfoFormat("SaveBestLap: layoutId={0}, classId={1}, laptime={2}, points={3}, pointsPerMeter={4}", layoutId, classId, laptime, points.Length, pointsPerMeter);
            var r3eDataService = GetR3EDataService();
            if (r3eDataService == null) {
                Startup.logger.Error("SaveBestLap: r3eDataService is null");
                return;
            }
            r3eDataService.SaveBestLap(layoutId, classId, laptime, points, pointsPerMeter);
        }

        public string LoadBestLap(int layoutId, int classId)
        {
            Startup.logger.InfoFormat("LoadBestLap: layoutId={0}, classId={1}", layoutId, classId);
            var r3eDataService = GetR3EDataService();
            if (r3eDataService == null) {
                Startup.logger.Error("LoadBestLap: r3eDataService is null");
                return "{}";
            }
            return r3eDataService.LoadBestLap(layoutId, classId);
        }

        public void Response(string response)
        {
            _ = response;
        }

        [HubMethodName("get-port")]
        public void GetPort(object input)
        {
            ExecuteAllListeners("get-port", input);
        }

        [HubMethodName("used-keys")]
        public void UsedKeys(object input)
        {
            ExecuteAllListeners("used-keys", input);
        }

        [HubMethodName("load-settings")]
        public void LoadSettings(object input)
        {
            ExecuteAllListeners("load-settings", input);
        }

        [HubMethodName("get-hud-layout")]
        public void GetHudLayout(object input)
        {
            ExecuteAllListeners("get-hud-layout", input);
        }

        [HubMethodName("set-hud-layout")]
        public void SetHudLayout(object input)
        {
            ExecuteAllListeners("set-hud-layout", input);
        }

        [HubMethodName("load-replay-preset")]
        public void LoadReplayPreset(object input)
        {
            ExecuteAllListeners("load-replay-preset", input);
        }

        [HubMethodName("unload-replay-preset")]
        public void UnLoadReplayPreset(object input)
        {
            ExecuteAllListeners("unload-replay-preset", input);
        }

        [HubMethodName("update-preset-name")]
        public void UpdatePresetName(object input)
        {
            ExecuteAllListeners("update-preset-name", input);
        }

        [HubMethodName("update-preset-is-replay")]
        public void UpdatePresetIsReplay(object input)
        {
            ExecuteAllListeners("update-preset-is-replay", input);
        }

        [HubMethodName("toggle-element")]
        public void ToggleElement(object input)
        {
            ExecuteAllListeners("toggle-element", input);
        }

        [HubMethodName("reset-active-layout")]
        public void ResetActiveLayout(object input)
        {
            ExecuteAllListeners("reset-active-layout", input);
        }

        [HubMethodName("request-layout-visibility")]
        public void RequestLayoutVisibility(object input)
        {
            ExecuteAllListeners("request-layout-visibility", input);
        }

        [HubMethodName("check-for-updates")]
        public void CheckForUpdates(object input)
        {
            ExecuteAllListeners("check-for-updates", input);
        }

        [HubMethodName("lock-overlay")]
        public void LockOverlay(object input)
        {
            ExecuteAllListeners("lock-overlay", input);
        }

        [HubMethodName("set-setting")]
        public void SetSetting(object input)
        {
            ExecuteAllListeners("set-setting", input);
        }

        [HubMethodName("show-log-file")]
        public void ShowLogFile(object input)
        {
            ExecuteAllListeners("show-log-file", input);
        }

        [HubMethodName("new-hud-layout")]
        public void NewHudLayout(object input)
        {
            ExecuteAllListeners("new-hud-layout", input);
        }

        [HubMethodName("delete-hud-layout")]
        public void DeleteHudLayout(object input)
        {
            ExecuteAllListeners("delete-hud-layout", input);
        }

        [HubMethodName("restart-app")]
        public void RestartApp(object input)
        {
            ExecuteAllListeners("restart-app", input);
        }

        [HubMethodName("webHudMode")]
        public void WebHudMode(object input)
        {
            ExecuteAllListeners("webHudMode", input);
        }

        public static Task RegisterListeners(string channel, Action<object> action)
        {
            Listeners.FirstOrDefault(x => x.Key == channel).Value.Add(action);
            return Task.CompletedTask;
        }

        private static string SelectName(MethodInfo type)
        {
            var attr = type.GetCustomAttribute(typeof(HubMethodNameAttribute)) as HubMethodNameAttribute;
            if (attr is null)
            {
                return type.Name;
            }
            return attr.Name;
        }


        private void ExecuteAllListeners(string channel, object value)
        {
            var listeners = Listeners.FirstOrDefault(x => x.Key.Equals(channel));
            foreach (var listener in listeners.Value)
            {
                listener(value);
            }
        }
    }
}