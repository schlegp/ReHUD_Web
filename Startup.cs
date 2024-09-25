using ElectronNET.API;
using ElectronNET.API.Entities;
using log4net;
using log4net.Config;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ReHUD.Extensions;
using ReHUD.Interfaces;
using ReHUD.Models;
using ReHUD.Utils;
using SignalRChat.Hubs;
using System.Reflection;
using System.Text.Json;

namespace ReHUD;

public class Startup
{
    public static readonly ILog logger = LogManager.GetLogger(typeof(Startup)); 
    private static string? logFilePath;
    private static int Port;

    private IUpdateService? updateService;
    private IRaceRoomObserver? raceroomObserver;
    private ISharedMemoryService? sharedMemoryService;
    private IR3EDataService? r3eDataService;
    private ICommunicationService? communicationService;

    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }
    public static bool IsWebHud;

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IUpdateService updateService, IRaceRoomObserver raceroomObserver, ISharedMemoryService sharedMemoryService, IR3EDataService r3eDataService, ICommunicationService commService)
    {
        
        Port = app.ServerFeatures.Get<IServerAddressesFeature>()!.Addresses.Select(address => new Uri(address).Port).FirstOrDefault();

        logFilePath = Path.Combine(UserData.dataPath, "ReHUD.log");
        GlobalContext.Properties["LogFilePath"] = logFilePath;

        var logRepository = LogManager.GetRepository(Assembly.GetEntryAssembly());
        XmlConfigurator.Configure(logRepository, new FileInfo("log4net.config"));

        this.updateService = updateService;
        this.raceroomObserver = raceroomObserver;
        this.sharedMemoryService = sharedMemoryService;
        this.r3eDataService = r3eDataService;
        this.communicationService = commService;
        settings.Load();
        IsWebHud = settings.isWebHud;


        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }
        else
        {
            app.UseExceptionHandler("/Error");
            app.UseHsts();
        }

        app.UseHttpsRedirection();
        app.UseStaticFiles();

        app.UseRouting();


        app.UseEndpoints(endpoints =>
        {
            endpoints.MapHub<ReHUDHub>("/ReHUDHub");
            endpoints.MapRazorPages();
        });

        Electron.App.CommandLine.AppendSwitch("enable-transparent-visuals");


        version.Load();
        _ = updateService.GetAppVersion().ContinueWith(async (t) =>
        {
            try
            {
                await version.Update(t.Result);


                settings.Load();
                await LoadSettings();
            }
            catch (Exception e)
            {
                logger.Error("Error loading settings", e);
                await QuitApp(e);
            }

            try
            {
                HudLayout.LoadHudLayouts();
            }
            catch (Exception e)
            {
                logger.Error("Error loading HUD layouts", e);
            }

            try
            {
                string preset = await Electron.App.CommandLine.GetSwitchValueAsync("preset");
                if (preset != null && preset.Length > 0)
                {
                    HudLayout? layout = HudLayout.GetHudLayout(preset);
                    if (layout != null)
                    {
                        HudLayout.SetActiveLayout(layout);
                    }
                    else
                    {
                        logger.WarnFormat("Could not find preset: {0}", preset);
                    }
                }
            }
            catch (Exception e)
            {
                logger.Error("Error loading preset", e);
            }
            Electron.App.Ready += async () =>
            {
                try
                {
                    r3eDataService.Load();
                    if (!IsWebHud)
                    {
                        await CreateMainWindow();
                    }
                    await CreateSettingsWindow(env);

                    this.raceroomObserver.Start();
                }
                catch (Exception e)
                {
                    logger.Error("Error creating windows", e);
                }
            };

            await RegisterCallbacks();
            var ports = app.ServerFeatures.Get<IServerAddressesFeature>()!.Addresses.Select(address => new Uri(address).Port);
            logger.Info($"Started Webinterface on Ports:");
            foreach (var port in ports)
            {
                logger.Info($"{port}");
            }
        });
    }


    public static BrowserWindow? MainWindow { get; private set; }
    public static BrowserWindow? SettingsWindow { get; private set; }

    private const string anotherInstanceMessage = "Another instance of ReHUD is already running";
    private readonly string logFilePathWarning = $"Log file path could not be determined. Try searching for a file named 'ReHUD.log' in '{UserData.dataPath}'";

    private const string BLACK_OPAQUE = "#FF000000";
    private const string BLACK_TRANSPARENT = "#00000000";

    internal static readonly ReHUDVersion version = new();
    internal static readonly Settings settings = new();

    private static async Task<BrowserWindow> CreateWindowAsync(BrowserWindowOptions options, string loadUrl = "/")
    {
        loadUrl = "http://localhost:" + BridgeSettings.WebPort + loadUrl;
        return await Electron.WindowManager.CreateWindowAsync(options, loadUrl);
    }

    // Should only be set once because changes only take effect after a restart
    // TODO: Move to settings service once implemented
    public static bool IsInVrMode { get; private set; }

    private async Task RegisterCallbacks()
    {
        await communicationService!.On("get-port", async (_) =>
        {
            var windows = new[] { MainWindow, SettingsWindow }.Where(x => x != null);

            // Send to browser if not in electron
            if (!!settings.isWebHud)
            {
                await communicationService.Send(null, "port", Port);
            }

            foreach (var window in windows)
            {
                await communicationService.Send(window, "port", BridgeSettings.WebPort);
            }
        });

        await communicationService.On("used-keys", (args) =>
        {
            if (args == null)
                return;

            if (args is JsonElement jsonArgs)
            {
                r3eDataService!.UsedKeys = jsonArgs.Deserialize<string[]>();
                return;
            }
            var keys = ((JArray)args).Select(x => (string?)x)?.Where(x => x != null)?.ToArray();

            r3eDataService!.UsedKeys = keys;
        });


        await communicationService.On("get-hud-layout", async (args) =>
        {
            SendHudLayout();
        });

        await communicationService.On("set-hud-layout", async (args) =>
        {
            if (args == null || args.ToString() == null)
                return;

            if (IsInEditMode)
            {
                logger.Warn("Cannot set HUD layout while in edit mode");
                return;
            }

            string argsString = args.ToString()!;

            HudLayout? layout;
            if (argsString.Length > 0 && argsString[0] == '{')
            { // update existing (active) layout
                try
                {
                    Dictionary<string, HudElement>? layoutElements = JsonConvert.DeserializeObject<Dictionary<string, HudElement>>(argsString);
                    if (layoutElements == null)
                    {
                        logger.ErrorFormat("Invalid HUD layout: {0}", args);
                        return;
                    }
                    layout = HudLayout.ActiveHudLayout;
                    if (layout == null)
                    {
                        logger.Warn("No active HUD layout, creating a new one");
                        layout = HudLayout.AddHudLayout(new HudLayout(true));
                    }
                    layout.UpdateElements(layoutElements);
                    UpdateActiveLayout(layout);
                }
                catch (Exception e)
                {
                    logger.Error("Error deserializing HUD layout", e);
                    return;
                }
            }
            else
            { // switch to existing layout
                layout = HudLayout.GetHudLayout(argsString);
                if (layout != null)
                {
                    HudLayout.SetActiveLayout(layout);
                    SendHudLayout(layout, false);
                }
            }
            if (layout == null)
            {
                logger.ErrorFormat("Invalid HUD layout: {0}", args);
                return;
            }
        });
        await communicationService.On("load-replay-preset", (args) =>
        {
            var layout = HudLayout.LoadReplayLayout();
            if (layout != null)
            {
                SendHudLayout(layout);
            }
        });
        await communicationService.On("unload-replay-preset", (args) =>
        {
            var layout = HudLayout.UnloadReplayLayout();
            if (layout != null)
            {
                SendHudLayout(layout);
            }
        });

        await communicationService.On("update-preset-name", async (args) =>
        {
            string? oldName;
            string? newName;
            if (args is JsonElement jsonData)
            {
                oldName = jsonData[0].ToString();
                newName = jsonData[1].ToString();
            }
            else
            {
                JArray array = (JArray)args;
                oldName = (string?)array[0];
                newName = (string?)array[1];
            }

            if (oldName == null || newName == null)
                return;

            var layout = HudLayout.GetHudLayout(oldName);
            if (layout != null)
            {
                await RenameLayout(layout, newName);
            }
        });

        await communicationService.On("update-preset-is-replay", (args) =>
        {
            string? name;
            bool isReplay;
            if (args is JsonElement jsonData)
            {
                name = jsonData[0].ToString();
                isReplay = bool.Parse(jsonData[1].ToString().ToLower());
            }
            else
            {
                JArray array = (JArray)args;
                name = (string?)array[0];
                isReplay = (bool)array[1];
            }


            if (name == null)
                return;

            var layout = HudLayout.GetHudLayout(name);
            if (layout != null)
            {
                layout.IsReplayLayout = isReplay;
                layout.Save();

                SendHudLayout();
            }
        });

        await communicationService.On("toggle-element", async (args) =>
        {
            string? elementId;
            bool shown;
            if (args is JsonElement jsonData)
            {
                elementId = jsonData[0].ToString();
                shown = bool.Parse(jsonData[1].ToString().ToLower());
            }
            else
            {
                JArray array = (JArray)args;
                elementId = (string?)array[0];
                shown = (bool)array[1];
            }

            if (elementId == null)
                return;

            await communicationService.Send(MainWindow, "toggle-element", elementId, shown);
        });

        await communicationService.On("reset-active-layout", (args) =>
        {
            try
            {
                var layout = HudLayout.ActiveHudLayout;
                if (layout != null)
                {
                    layout.Reset();
                    SendHudLayout();
                }
            }
            catch (Exception e)
            {
                logger.Error("Error resetting HUD layout", e);
            }
        });

        await communicationService.On("request-layout-visibility", (args) =>
        {
            r3eDataService.HUDShown = null;
        });
        await communicationService.On("restart-app", (args) =>
        {
            Electron.App.Relaunch();
            Electron.App.Exit(0);
        });

        await communicationService.On("load-settings", async (data) =>
        {
            await InitSettingsWindow();
        });

        await communicationService.On("check-for-updates", async (data) =>
        {
            await updateService.CheckForUpdates();
        });

        await communicationService.On("lock-overlay", async (data) =>
        {
            var jsonData = (JsonElement)data;
            bool locked = bool.Parse(jsonData[0].ToString());
            bool save = bool.Parse(jsonData[1].ToString());

            if (!locked) // enter edit mode
            {
                if (MainWindow != null)
                {
                    await communicationService.Invoke(MainWindow, "edit-mode");

                    logger.Info("Entering edit mode");

                    r3eDataService.SetEnteredEditMode();
                    IsInEditMode = true;

                    if (!sharedMemoryService.IsRunning)
                    {
                        await r3eDataService.SendEmptyData();
                    }
                }
            }
            else
            {
                r3eDataService.HUDShown = null;
                IsInEditMode = false;

                if (!sharedMemoryService.IsRunning)
                {
                    await communicationService.Send(MainWindow, "hide");
                }
            }

            MainWindow?.SetIgnoreMouseEvents(locked);
            
            SettingsWindow?.SetAlwaysOnTop(!IsInVrMode && !locked, OnTopLevel.screenSaver);

            if (locked && save) // save
            {
                string? newName = jsonData.GetArrayLength() > 2 ? jsonData[2].ToString() : null;
                if (newName != null && HudLayout.ActiveHudLayout != null && HudLayout.ActiveHudLayout.Name != newName)
                {
                    await RenameActiveLayout(newName);
                }
                await communicationService.Send(MainWindow, "save-hud-layout");
            }
            else if (locked && MainWindow != null) // cancel
            {
                HudLayout.ActiveHudLayout?.Cancel();
                logger.Info("Canceling HUD layout changes");
                SendHudLayout();
            }
        });

        await communicationService.On("set-setting", (arg) =>
        {
            if (arg is JsonElement jsonArg)
            {
                communicationService.Send(MainWindow, "set-setting", jsonArg);
                var actualValue = ConvertJsonElement(jsonArg[1]);
                _ = SaveSetting(jsonArg[0].ToString(), actualValue, false);
            }
            else
            {
                JArray array = (JArray)arg;
                if (array.Count == 2 && array[0] != null && array[0].Type == JTokenType.String)
                    _ = SaveSetting(array[0].ToString(), ConvertJToken(array[1])!, false);
                else
                    logger.ErrorFormat("Invalid setting when attempting 'set-setting': {0}", arg);
            }
        });


        await communicationService.On("show-log-file", async (arg) =>
        {
            if (logFilePath == null)
            {
                await ShowMessageBox(SettingsWindow, logFilePathWarning, "Warning", MessageBoxType.warning);
            }
            else
            {
                await Electron.Shell.ShowItemInFolderAsync(Path.Combine(logFilePath));
            }
        });

        await communicationService.On("new-hud-layout", (arg) =>
        {
            var layout = HudLayout.AddHudLayout(new HudLayout(true));
            SendHudLayout(layout);
        });

        await communicationService.On("delete-hud-layout", async (arg) =>
        {
            string? name = arg?.ToString();
            if (name == null)
                return;
            var layout = HudLayout.GetHudLayout(name);
            if (layout != null)
            {
                await layout.DeleteLayout();
                SendHudLayout();
            }
        });

        await communicationService.On("webHudMode", async (_) =>
        {
            if (MainWindow is null)
            {
                await CreateMainWindow();
                return;
            }
            
            MainWindow.Destroy();
            MainWindow = null;
        });

    }

    private object ConvertJsonElement(JsonElement jsonElement)
    {
        switch (jsonElement.ValueKind)
        {
            case JsonValueKind.False:
            case JsonValueKind.True:
                return bool.Parse(jsonElement.ToString());
            case JsonValueKind.Number:
                return double.Parse(jsonElement.ToString());
            case JsonValueKind.String:
            default:
                return jsonElement.ToString();

        }
    }

    private async Task CreateMainWindow()
    {
        IsInVrMode = (settings.Data.Get("vrMode") as bool?) ?? false;

        MainWindow = await CreateWindowAsync(new BrowserWindowOptions()
        {
            Resizable = false,
            Fullscreen = true,
            Minimizable = false,
            Movable = false,
            Frame = false,
            Transparent = true,
            BackgroundColor = IsInVrMode ? BLACK_OPAQUE : BLACK_TRANSPARENT,
            Icon = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ReHUD.png"),
            WebPreferences = new WebPreferences()
            {
                EnableRemoteModule = true,
                NodeIntegration = true,
            }
        }, loadUrl: "/Index");

        bool gotLock = await Electron.App.RequestSingleInstanceLockAsync((args, arg) => { });
        if (!gotLock)
        {
            await QuitApp(anotherInstanceMessage);
            return;
        }

        r3eDataService.HUDWindow = MainWindow;

        MainWindow.SetAlwaysOnTop(!IsInVrMode, OnTopLevel.screenSaver);
        MainWindow.SetIgnoreMouseEvents(true);

        Electron.App.Ready += async () =>
        {
            foreach (var window in Electron.WindowManager.BrowserWindows)
            {
                window.WebContents.OpenDevTools();
            }
        };

        Electron.App.BeforeQuit += async (QuitEventArgs args) =>
        {
            args.PreventDefault();
            await communicationService.Send(MainWindow, "quit");
            await communicationService.Send(SettingsWindow, "quit");
            await Task.Delay(300);
            logger.Info("Exiting...");
            Electron.App.Exit(0);
        };
    }

    private void SendHudLayout()
    {
        var layout = GetHudLayout();
        if (layout == null)
            return;
        SendHudLayout(layout);
    }

    private void SendHudLayout(HudLayout layout, bool sendToSettings = true)
    {
        communicationService.Send(MainWindow, "hud-layout", layout.SerializeElements()).Wait();
        if (SettingsWindow != null && sendToSettings)
        {
            communicationService.Send(SettingsWindow, "hud-layouts", HudLayout.SerializeLayouts(true)).Wait();
        }
    }

    private async Task InitSettingsWindow()
    {
        //await communicationService.Send(MainWindow, "settings", settings.Serialize());
        await communicationService.Send(SettingsWindow, "settings", settings.Serialize());
        await communicationService.Send(SettingsWindow, "version", await updateService.GetAppVersion());
    }

    public static bool IsInEditMode { get; private set; }

    private async Task CreateSettingsWindow(IWebHostEnvironment env)
    {
        SettingsWindow = await CreateWindowAsync(new BrowserWindowOptions()
        {
            Width = 800,
            Height = 870,
            Icon = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "ReHUD.png"),
            WebPreferences = new WebPreferences()
            {
                EnableRemoteModule = true,
                NodeIntegration = true,
            },
        }, loadUrl: "/Settings");

        if (!env.IsDevelopment())
            SettingsWindow.RemoveMenu();

        SettingsWindow.OnClosed += () => Electron.App.Quit();
    }


    private static object? ConvertJToken(JToken token)
    {
        if (token == null)
            return null;
        switch (token.Type)
        {
            case JTokenType.Object:
                return token.Children<JProperty>().ToDictionary(prop => prop.Name, prop => ConvertJToken(prop.Value));
            case JTokenType.Array:
                return token.Select(ConvertJToken).ToList();
            default:
                return ((JValue)token).Value ?? token;
        }
    }

    public static readonly string ERROR_TITLE = "Error";

    public static async Task<MessageBoxResult> ShowMessageBox(BrowserWindow? window, string message, string? title = null, MessageBoxType type = MessageBoxType.error)
    {
        if (!settings.isWebHud)
        {
            MessageBoxOptions options = PrepareMessageBox(message, title, type);
            if (window == null)
                return await Electron.Dialog.ShowMessageBoxAsync(options);
            return await Electron.Dialog.ShowMessageBoxAsync(window, options);

        }
        else
        {
            return new MessageBoxResult();
        }
    }

    public static async Task<MessageBoxResult> ShowMessageBox(string message, string? title = null, MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    public static async Task<MessageBoxResult> ShowMessageBox(string message, string[] buttons, string? title = null, MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = PrepareMessageBox(message, title, type);
        options.Buttons = buttons;
        return await Electron.Dialog.ShowMessageBoxAsync(options);
    }

    public async static Task QuitApp(string? message = null)
    {
        if (message != null)
        {
            await ShowMessageBox(message);
        }
        Electron.App.Quit();
    }

    public async static Task QuitApp(Exception e)
    {
        await ShowMessageBox($"An unexpected error occured. Please report this to the developer in the forum or on Discord, along with the log file.\n\n{e.Message}\n{e.StackTrace}");
        Electron.App.Quit();
    }

    private static MessageBoxOptions PrepareMessageBox(string message, string? title = null, MessageBoxType type = MessageBoxType.error)
    {
        MessageBoxOptions options = new(message)
        {
            Type = type,
            Title = title ?? ERROR_TITLE,
        };

        switch (type)
        {
            case MessageBoxType.error:
                logger.Error(message);
                break;
            case MessageBoxType.info:
                logger.Info(message);
                break;
            case MessageBoxType.warning:
                logger.Warn(message);
                break;
        }

        return options;
    }

    private async Task SaveSetting(string key, object value, bool sendToWindow = true)
    {
        settings.Data.Set(key, value);
        settings.Save();

        await LoadSettings(key, value);

        if (SettingsWindow != null && sendToWindow)
        {
            await communicationService.Send(SettingsWindow, "settings", settings.Serialize());
        }
    }
    
    public async Task LoadSettings(string? key = null, object? value = null)
    {
        if (key == null)
        {
            foreach (var setting in settings.Data.Settings)
            {
                await LoadSettings(setting.Key, setting.Value);
            }
        }
        else
        {
            if (value == null)
                return;
            switch (key)
            {
                case "screenToUse":
                    if (!settings.isWebHud)
                    {
                        await LoadMonitor(value.ToString());
                    }
                    break;
                case "framerate":
                    if (value.IsInt())
                        sharedMemoryService.FrameRate = Utilities.SafeCastToLong(value);
                    break;
                case "hardwareAcceleration":
                    if (!settings.isWebHud && value is bool hardwareAcceleration)
                        SetHardwareAccelerationEnabled(hardwareAcceleration);
                    break;
                case "vrMode":
                    if (!settings.isWebHud && value is bool vrMode)
                        SetVRMode(vrMode);
                    break;
            }
        }
    }

    private static readonly string[] hardwareAccelerationSettings = new string[] { "disable-gpu-compositing", "disable-gpu", "disable-software-rasterizer" };
    private static void SetHardwareAccelerationEnabled(bool enabled)
    {
        logger.InfoFormat("Setting hardware acceleration: {0}", enabled);
        if (enabled)
        {
            foreach (var setting in hardwareAccelerationSettings)
            {
                Electron.App.CommandLine.RemoveSwitch(setting);
            }
        }
        else
        {
            foreach (var setting in hardwareAccelerationSettings)
            {
                Electron.App.CommandLine.AppendSwitch(setting);
            }
        }
    }

    private static void SetVRMode(bool vrMode)
    {
        logger.InfoFormat("Setting main window background opacity: {0}", vrMode ? "#FF" : "#00");
        // Can't use BrowserWindow.SetBackgroundColor because it doesn't work for some reason, forcing restarts instead.
    }

    private static async Task LoadMonitor(string? value = null)
    {
        if (MainWindow == null)
            return;
        var monitorId = value ?? await GetMainWindowDisplay();
        logger.InfoFormat("Loading monitor: {0}", monitorId);
        if (monitorId == null)
            return;
        var monitor = await GetDisplayById(monitorId);
        if (monitor == null)
            return;
        MainWindow.SetBounds(monitor.WorkArea);
    }

    private static HudLayout? GetHudLayout()
    {
        try
        {
            var layout = HudLayout.ActiveHudLayout;
            layout ??= HudLayout.AddHudLayout(new HudLayout(true));
            return layout;
        }
        catch (Exception e)
        {
            logger.Error("Error getting HUD layout", e);
            return null;
        }
    }

    private void UpdateActiveLayout(HudLayout layout, bool sendToSettings = false)
    {
        if (IsInEditMode)
        {
            logger.Warn("Cannot set HUD layout while in edit mode");
            return;
        }
        layout = HudLayout.UpdateActiveHudLayout(layout);
        layout.Save();
        SendHudLayout(layout, sendToSettings);
    }

    private async Task<bool> RenameActiveLayout(string newName)
    {
        if (HudLayout.ActiveHudLayout == null)
        {
            logger.Error("No active HUD layout");
            return false;
        }
        return await RenameLayout(HudLayout.ActiveHudLayout, newName);
    }

    private async Task<bool> RenameLayout(HudLayout layout, string newName)
    {
        bool res = await layout.Rename(newName);
        if (res)
        {
            layout.Save();
        }
        else
        {
            DiscardNameChange();
        }
        return res;
    }

    private void DiscardNameChange()
    {
        HudLayout layout = HudLayout.ActiveHudLayout ?? throw new InvalidOperationException("No active HUD layout");
        communicationService.Send(SettingsWindow, "discard-name-change", layout.Name);
    }

    public static Task<Display[]> GetDisplays()
    {
        return Electron.Screen.GetAllDisplaysAsync();
    }

    public static async Task<string?> GetMainWindowDisplay()
    {
        if (settings.Data.Contains("screenToUse"))
        {
            return (string?)settings.Data.Get("screenToUse");
        }
        return (await Electron.Screen.GetPrimaryDisplayAsync()).Id;
    }

    public static async Task<Display?> GetDisplayById(string id)
    {
        return Array.Find(await GetDisplays(), x => x.Id == id);
    }
}
