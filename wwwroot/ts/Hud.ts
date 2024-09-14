import Action from "./Action";
import EventListener from './EventListener';
import SettingsValue from "./SettingsValue";
import DriverManager from "./actions/DriverManager";
import RankedData from "./actions/RankedData";
import TireManager from './actions/TireManager';
import {
    DEFAULT_RADAR_RADIUS,
    DELTA_MODE,
    FRAMERATE,
    HARDWARE_ACCELERATION,
    IExtendedShared,
    P2P_READY_VOLUME,
    POSITION_BAR_CELL_COUNT,
    PRESSURE_UNITS,
    RADAR_BEEP_VOLUME,
    RADAR_FADE_RANGE,
    RADAR_LOW_DETAIL,
    RADAR_OPACITY,
    RADAR_POINTER,
    RADAR_RANGE,
    RELATIVE_SAFE_MODE,
    SHOW_DELTA_ON_INVALID_LAPS,
    SPEED_UNITS,
    VR_MODE
} from "./consts";
import IShared from './r3eTypes';
import {AudioController} from "./utils";
import {HudLayoutElements} from './settingsPage';
import SharedMemorySupplier, {GracePeriodBetweenPresets} from './SharedMemorySupplier';
import EventEmitter from './EventEmitter';
import HubCommunication from './HubCommunication';
import PlatformHandler from './platform/PlatformHandler';

const commsHandler = new PlatformHandler();
export default class Hud extends EventListener {
    public static readonly PROCESSING_WARNING_THRESHOLD = 9;
    public static readonly DELAY_WARNING_THRESHOLD = 200;
    public static readonly DELAY_DROP_THRESHOLD = 5000;

    public static readonly hub: HubCommunication = new HubCommunication();

    override sharedMemoryKeys: string[] = ['+timestamp', 'player'];
    override isEnabled(): boolean {
        return true;
    }


    public _layoutElements: HudLayoutElements = {};
    public set layoutElements(layoutElements: HudLayoutElements) {
        this._layoutElements = layoutElements;
        SharedMemorySupplier.informBackend(true);
    }
    public get layoutElements(): HudLayoutElements {
        return this._layoutElements;
    }

    private _isInEditMode: boolean = false;
    public actionServices: Action[] = [];
    public rankedDataService: RankedData = new RankedData();
    public driverManagerService: DriverManager = new DriverManager();
    public tireManagerService: TireManager = new TireManager();

    private normalActions: Array<Action> = new Array<Action>();
    private alwaysExecuteActions: Array<Action> = new Array<Action>();
    public readonly r3eData: any;
    public readonly radarAudioController = new AudioController({volumeMultiplier: 1, soundFileName: 'beep.wav'});
    public readonly p2pAudioController = new AudioController({volumeMultiplier: 1, soundFileName: 'echo_beep.wav'});

    private static data: IExtendedShared;

    private static _instance: Hud;

    public isInEditMode(): boolean {
        return this._isInEditMode;
    }

    private onEditModeChangedListeners: Array<(isInEditMode: boolean) => boolean> = [];
    public setIsInEditMode(isInEditMode: boolean): void {
        this._isInEditMode = isInEditMode;

        const keep = [];
        for (const listener of this.onEditModeChangedListeners) {
            const res = listener(isInEditMode);
            if (res === true) {
                keep.push(listener);
            }
        }
        this.onEditModeChangedListeners = keep;
    }

    public addOnEditModeChangedListener(listener: (isInEditMode: boolean) => boolean): void {
        this.onEditModeChangedListeners.push(listener);
    }

    private registerService(action: Action): void {
        this.actionServices.push(action);
    }

    constructor(positionalActions: Action[]) {
        super("Hud");
        if (Hud._instance != undefined) {
            throw new Error("Hud is a singleton!");
        }
        Hud._instance = this;

        this.registerService(this.driverManagerService);
        this.registerService(this.tireManagerService);

        for (const action of positionalActions.concat(this.actionServices)) {
            action.setHud(this);

            if (action.shouldExecuteWhileHidden()) {
                this.alwaysExecuteActions.push(action);
            } else {
                this.normalActions.push(action);
            }
        }

        this.loadR3EData();

        new SettingsValue(SPEED_UNITS, 'kmh');
        new SettingsValue(PRESSURE_UNITS, 'kPa');
        new SettingsValue(RADAR_RANGE, DEFAULT_RADAR_RADIUS);
        new SettingsValue(RADAR_LOW_DETAIL, false);
        new SettingsValue(RADAR_POINTER, false);
        new SettingsValue(RADAR_FADE_RANGE, 2);
        new SettingsValue(RADAR_OPACITY, 0.8);
        new SettingsValue(RADAR_BEEP_VOLUME, 1.5).onValueChanged((value) => {
            this.radarAudioController.setVolume(value);
        });
        new SettingsValue(P2P_READY_VOLUME, 1.5).onValueChanged((value) => {
            this.p2pAudioController.setVolume(value);
        });
        new SettingsValue(RELATIVE_SAFE_MODE, false);
        new SettingsValue(POSITION_BAR_CELL_COUNT, 13);
        new SettingsValue(DELTA_MODE, 'session');
        new SettingsValue(SHOW_DELTA_ON_INVALID_LAPS, false);
        new SettingsValue(FRAMERATE, 60);
        new SettingsValue(HARDWARE_ACCELERATION, true);
        new SettingsValue(VR_MODE, false);

        new EventEmitter('EventEmitter'); //TODO: currently this is needed to get the shared memory keys it's using, need to un-staticify it maybe
        SharedMemorySupplier.informBackend();
    }

    private async loadR3EData() {
        (this as any).r3eData = await (await fetch('https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json')).json();
    }

    private static async executeAction(action: Action, data: IExtendedShared): Promise<void> {
        try {
            action._execute(data);
        } catch (e) {
            if (!GracePeriodBetweenPresets.isInGracePeriod) {
                console.error('Error while executing action \'' + action.toString() + '\'', e.toString(), e);
            }
        }
    }

    public render(data: IExtendedShared, forceAll: boolean = false, isShown: boolean = true): void {
        const start = Date.now();
        const diffStart = start - data.timestamp;
        if (diffStart > Hud.DELAY_DROP_THRESHOLD) {
            console.error('Data was received with a delay of', diffStart + 'ms dropping frame');
            return;
        } else if (diffStart > Hud.DELAY_WARNING_THRESHOLD) {
            console.warn('Data was received with a delay of', diffStart + 'ms');
        }
        (window as any).r3eData = data; // for debugging
        Hud.data = data;
        for (const action of this.alwaysExecuteActions) {
            if (forceAll || action.shouldExecute()) {
                Hud.executeAction(action, data);
            }
        }

        if (!isShown)
            return;
        for (const action of this.normalActions) {
            if (forceAll || action.shouldExecute()) {
                Hud.executeAction(action, data);
            }
        }
        const end = Date.now();
        const diffEnd = end - start;
        if (diffEnd > Hud.PROCESSING_WARNING_THRESHOLD) {
            console.warn('Render cycle completed in', diffEnd + 'ms');
        }
    }

    public static getGameTimestamp() {
        return Hud.data.rawData.player.gameSimulationTime;
    }
    
    protected override onEnteredReplay(data: IShared): void {
        commsHandler.sendCommand('load-replay-preset');
    }
    protected override onLeftReplay(data: IShared): void {
        commsHandler.sendCommand('unload-replay-preset');
    }
}