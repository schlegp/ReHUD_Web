﻿import PlatformHandler from './platform/PlatformHandler';

import EventEmitter from './EventEmitter';
import Draggable, {DraggableEvent, TransformableHTMLElement} from './Draggable';
import Hud from './Hud';
import {computeUid, enableLogging, IExtendedDriverInfo} from './utils';
import {HudLayoutElements} from './settingsPage';
import CarSpeed from './hudElements/CarSpeed';
import Gear from './hudElements/Gear';
import EngineMap from './hudElements/EngineMap';
import EngineBraking from './hudElements/EngineBraking';
import BrakeBias from './hudElements/BrakeBias';
import Revs from './hudElements/Revs';
import FuelLeft from './hudElements/FuelLeft';
import FuelPerLap from './hudElements/FuelPerLap';
import FuelLapsLeft from './hudElements/FuelLapsLeft';
import FuelTimeLeft from './hudElements/FuelTimeLeft';
import FuelLastLap from './hudElements/FuelLastLap';
import FuelToEnd from './hudElements/FuelToEnd';
import FuelToAdd from './hudElements/FuelToAdd';
import FuelElement from './hudElements/FuelElement';
import Tires from './hudElements/Tires';
import DriverInputs from './hudElements/DriverInputs';
import Damage from './hudElements/Damage';
import Assists from './hudElements/Assists';
import RelativeViewer from './hudElements/RelativeViewer';
import TimeLeft from './hudElements/TimeLeft';
import EstimatedLapsLeft from './hudElements/EstimatedLapsLeft';
import SessionLastLap from './hudElements/SessionLastLap';
import SessionBestLap from './hudElements/SessionBestLap';
import Position from './hudElements/Position';
import Radar from './hudElements/Radar';
import IncidentPoints from './hudElements/IncidentPoints';
import SectorTimes from './hudElements/SectorTimes';
import Delta from './hudElements/Delta';
import SettingsValue from './SettingsValue';
import {ELEMENT_SCALE_POWER, IExtendedShared, TransformableId, TRANSFORMABLES} from './consts';
import TractionControl from './hudElements/TractionControl';
import PositionBar from './hudElements/PositionBar';
import CurrentLaptime from './hudElements/CurrentLaptime';
import StrengthOfField from './hudElements/StrengthOfField';
import AlltimeBestLap from './hudElements/AlltimeBestLap';
import PitTimer from './hudElements/PitTimer';
import CompletedLaps from './hudElements/CompletedLaps';
import IpcCommunication from './IpcCommunication';
import Rake from './hudElements/Rake';
import DRS from './hudElements/Drs';
import P2P from './hudElements/PushToPass';
import {GracePeriodBetweenPresets} from './SharedMemorySupplier';

const commsHandler = new PlatformHandler();

enableLogging(commsHandler, 'index');


const hud = new Hud([
    new CarSpeed({name: 'CarSpeed', elementId: 'speed', transformableId: 'basic', renderEvery: 0}),
    new Gear({name: 'Gear', elementId: 'gear', transformableId: 'basic', renderEvery: 0}),
    new Assists({name: 'Assists', elementId: 'assist', transformableId: 'basic', renderEvery: 0}),
    new EngineMap({name: 'EngineMap', elementId: 'engine-map', transformableId: 'basic', renderEvery: 100}),
    new EngineBraking({name: 'EngineBraking', elementId: 'engine-brake', transformableId: 'basic', renderEvery: 500}),
    new BrakeBias({name: 'BrakeBias', elementId: 'brake-bias', transformableId: 'basic', renderEvery: 50}),
    new TractionControl({name: 'TractionControl', elementId: 'traction-control', transformableId: 'basic', renderEvery: 50}),
    new Revs({name: 'Revs', elementId: 'revs', transformableId: 'basic', renderEvery: 0}),
    new DriverInputs({name: 'DriverInputs', elementId: 'inputs', transformableId: 'driver-inputs', renderEvery: 0}),

    new PositionBar({name: 'PositionBar', elementId: 'position-bar', transformableId: 'position-bar', renderEvery: 80}),
    new RelativeViewer({name: 'RelativeViewer', elementId: 'relative-viewer', transformableId: 'relative-viewer', renderEvery: 80}),

    new FuelLeft({name: 'FuelLeft', elementId: 'fuel-left', transformableId: 'fuel-data', renderEvery: 200}),
    new FuelPerLap({name: 'FuelPerLap', elementId: 'fuel-per-lap', transformableId: 'fuel-data', renderEvery: 500}),
    new FuelLapsLeft({name: 'FuelLapsLeft', elementId: 'fuel-laps', transformableId: 'fuel-data', renderEvery: 200}),
    new FuelTimeLeft({name: 'FuelTimeLeft', elementId: 'fuel-time', transformableId: 'fuel-data', renderEvery: 200}),
    new FuelLastLap({name: 'FuelLastLap', elementId: 'fuel-last-lap', transformableId: 'fuel-data', renderEvery: 200}),
    new FuelToEnd({name: 'FuelToEnd', elementId: 'fuel-to-end', transformableId: 'fuel-data', renderEvery: 200}),
    new FuelToAdd({name: 'FuelToAdd', elementId: 'fuel-to-add', transformableId: 'fuel-data', renderEvery: 200}),
    new FuelElement({name: 'FuelElement', elementId: 'fuel-data', transformableId: 'fuel-data', renderEvery: 200}),

    new Tires({name: 'Tires', elementId: 'tires', transformableId: 'tires', renderEvery: 10}),
    new Damage({name: 'Damage', elementId: 'damage', transformableId: 'damage', renderEvery: 30}),

    new TimeLeft({name: 'TimeLeft', containerId: 'time-left-container', elementId: 'time-laps-left', transformableId: 'time-left-container', renderEvery: 80}),
    new EstimatedLapsLeft({name: 'EstimatedLapsLeft', containerId: 'estimated-laps-left-container', elementId: 'estimated-laps-left', transformableId: 'estimated-laps-left-container', renderEvery: 100}),
    new StrengthOfField({name: 'StrengthOfField', elementId: 'strength-of-field', containerId: 'strength-of-field-container', transformableId: 'strength-of-field-container', renderEvery: 500}),
    new SessionLastLap({name: 'SessionLastLaps', elementId: 'last-lap-session', containerId: 'last-lap-session-container', transformableId: 'last-lap-session-container', renderEvery: 200}),
    new SessionBestLap({name: 'SessionBestLap', elementId: 'best-lap-session', containerId: 'best-lap-session-container', transformableId: 'best-lap-session-container', renderEvery: 200}),
    new AlltimeBestLap({name: 'AlltimeBestLap', elementId: 'best-lap-alltime', containerId: 'best-lap-alltime-container', transformableId: 'best-lap-alltime-container', renderEvery: 200}),

    new Position({name: 'Position', containerId: 'position-container', elementId: 'position', transformableId: 'position-container', renderEvery: 30}),
    new CompletedLaps({name: 'CompletedLaps', containerId: 'completed-laps-container', elementId: 'completed-laps', transformableId: 'completed-laps-container', renderEvery: 100}),
    new CurrentLaptime({name: 'CurrentLaptime', elementId: 'current-laptime', containerId: 'current-laptime-container', transformableId: 'current-laptime-container', renderEvery: 0}),
    new IncidentPoints({name: 'IncidentPoints', containerId: 'incident-points-container', elementId: 'incident-points', transformableId: 'incident-points-container', renderEvery: 30}),

    new Radar({name: 'Radar', elementId: 'radar', transformableId: 'radar', renderEvery: 0}),

    new Delta({name: 'Delta', containerId: 'delta', elementId: 'delta-number', transformableId: 'delta', renderEvery: 50}),
    new SectorTimes({name: 'SectorTimes', containerId: 'sector-times', transformableId: 'sector-times', renderEvery: 20}),
    new PitTimer({name: 'PitTimer', containerId: 'pit-timer', elementId: 'pit-time-left', transformableId: 'pit-timer', renderEvery: 0}),

    new Rake({name: 'Rake', containerId:'rake', elementId: 'rake-bar-number', transformableId: 'rake', renderEvery: 3}),

    new DRS({name: 'DRS', containerId: 'drs', elementId: 'drs-left', transformableId: 'drs', renderEvery: 50}),
    new P2P({name: 'P2P', containerId: 'p2p', elementId: 'p2p-left', transformableId: 'p2p', renderEvery: 50}),
]);

(window as any).hud = hud;


let layoutLoaded = false;

function elementAdjusted(event: DraggableEvent) {
    const element = event.source;
    if (hud.layoutElements[element.id] == undefined)
        hud.layoutElements[element.id] = {left: 0, top: 0, scale: 1, shown: true};

    let scale = 1;
    if (!isNaN(element.dataset.scale as any)) {
        scale = parseFloat(element.dataset.scale);
    }
    hud.layoutElements[element.id].scale = scale;

    if (event.dragged) {
        hud.layoutElements[element.id].left = event.left;
        hud.layoutElements[element.id].top = event.top;

        element.style.left = event.left + 'px';
        element.style.top = event.top + 'px';

        element.classList.add('dragged');
    }
    
    element.classList.remove('hidden');
    if (!hud.layoutElements[element.id].shown) {
        element.classList.add('hidden');
    }
}

function elementToggled(elementId: TransformableId, shown: boolean) {
    if (!hud.isInEditMode()) {
        console.warn('elementToggled called while not in edit mode');
        return;
    }

    if (shown && hud.layoutElements[elementId]?.shown === false) {
        delete hud.layoutElements[elementId];
    } else {
        if (hud.layoutElements[elementId] == undefined)
            hud.layoutElements[elementId] = {left: 0, top: 0, scale: 1, shown: true};

        hud.layoutElements[elementId].shown = shown;
    }

    const element = document.getElementById(elementId);
    if (element == null) {
        console.warn('elementToggled called with invalid element id', elementId);
        return;
    }

    loadLayout();
}

function saveLayout() {
    hud.setIsInEditMode(false);
    exitEditMode();
    commsHandler.sendCommand('set-hud-layout', JSON.stringify(hud.layoutElements));
}
commsHandler.registerEvent('save-hud-layout', saveLayout);

commsHandler.registerEvent('toggle-element', (_: any, arg: any) => {
    elementToggled(arg[0], arg[1]);
});

const onDomReadyListeners: Array<() => void> = [];
function onDomReady(listener: () => void) {
    if (document.readyState == 'complete') {
        listener();
    } else {
        onDomReadyListeners.push(listener);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    for (const listener of onDomReadyListeners) {
        listener();
    }
    onDomReadyListeners.length = 0;
});


function loadLayout(layout?: HudLayoutElements) {
    onDomReady(() => _loadLayout(layout));
}
function _loadLayout(layout?: HudLayoutElements) {
    GracePeriodBetweenPresets.isInGracePeriod = true;
    if (layout == undefined)
        layout = hud.layoutElements;

    const prevLayout = hud.layoutElements;
    hud.layoutElements = layout;
    for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
        const element = document.getElementById(id);
        let left, top, scale: string | number, shown;
        if (hud.layoutElements[id] != undefined) {
            left = hud.layoutElements[id].left;
            top = hud.layoutElements[id].top;
            scale = hud.layoutElements[id].scale;
            shown = hud.layoutElements[id].shown;

            if (!prevLayout[id]?.shown && shown && layoutLoaded) {
                left = null;
                top = null;
                scale = 1;

                delete hud.layoutElements[id];
            } else {
                element.classList.add('dragged');
            }
        } else {
            left = null;
            top = null;
            scale = 1;
            shown = true;

            if (element == null) {
                console.warn('loadLayout called with invalid element id', id);
                continue;
            }
            element.classList.remove('dragged');
        }

        element.style.left = left == null ? null : left + 'px';
        element.style.top = top == null ? null : top + 'px';
        element.style.scale = isNaN(scale as any) || scale as any === "" ? null : Math.pow(parseFloat(scale.toString()), ELEMENT_SCALE_POWER).toString();
        element.dataset.scale = scale.toString();

        element.classList.remove('hidden');
        if (!shown) {
            element.classList.add('hidden');
        }
    }

    layoutLoaded = true;
    setTimeout(() => GracePeriodBetweenPresets.isInGracePeriod = false, GracePeriodBetweenPresets.DURATION);
}

async function  requestLayout() {
    await commsHandler.sendCommand('get-hud-layout');
}

function addTransformable(id: TransformableId) {
    // @ts-ignore
    const element: TransformableHTMLElement = document.getElementById(id);

    // draggable
    const draggable = new Draggable(element, {
        'drag:start': (event) => element.classList.add('dragged'),
        'drag:stop': (event) => elementAdjusted(event),
    });

    // resizable (scroll to scale)
    element.addEventListener('wheel', (e) => {
        let scale = Math.max(0.55, -e.deltaY / 2000 + (parseFloat(element.dataset.scale) || 1));
        element.dataset.scale = scale.toString();
        scale = Math.pow(scale, ELEMENT_SCALE_POWER);
        element.style.scale = scale.toString();
        elementAdjusted({source: element, left: null, top: null, dragged: false});
    });

    return draggable;
}

let isShown = true;
function showHUD() {
    isShown = true;
    document.body.style.display = 'block';
}

function hideHUD() {
    if (!hud.isInEditMode()) {
        isShown = false;
        document.body.style.display = 'none';
    } else {
        hud.addOnEditModeChangedListener((isInEditMode) => {
            if (!isInEditMode) {
                hideHUD();
                return false;
            }
            return true;
        });
    }
}


function enterEditMode() {
    hud.setIsInEditMode(true);
}

function exitEditMode() {
    hud.setIsInEditMode(false);
    commsHandler.sendCommand('request-layout-visibility');
}


commsHandler.registerEvent('hide', hideHUD);
commsHandler.registerEvent('show', showHUD);

IpcCommunication.handle('edit-mode', async () => {
    enterEditMode();
    showHUD();
});



commsHandler.registerEvent('hud-layout', (_:any, arg: string) => {
    exitEditMode();
    console.log("hud-layout: ", arg)
    hud.layoutElements = JSON.parse(arg[0]) as HudLayoutElements;
    loadLayout(hud.layoutElements);
});


const deltaTimes: number[] = [];
let lastTime: number = null;
let lastLogTime: number = null;
const LOG_FPS_EVERY = 60; // seconds
IpcCommunication.handle('r3eData', async (event, data_: string) => {
    console.log("r3eData: ", data_);
    let data = JSON.parse(data_) as IExtendedShared;

    if (data.timestamp == 0) {
        data.timestamp = Date.now();
    }
    for (const driver of data.rawData.driverData) {
        (driver.driverInfo as IExtendedDriverInfo).uid = computeUid(driver.driverInfo);
    }

    try {
        EventEmitter.cycle(data.rawData);
    } catch (e) {
        console.error('Error in EventEmitter.cycle', e);
    }
    hud.render(data, data.forceUpdateAll, isShown);

    const now = Date.now();
    if (lastTime != null) {
        deltaTimes.push(now - lastTime);

        if (lastLogTime == null || now - lastLogTime > LOG_FPS_EVERY * 1000) {
            const avg = deltaTimes.reduce((a, b) => a + b, 0) / deltaTimes.length;
            console.log(`Average FPS in the last ${LOG_FPS_EVERY} seconds:`, (1000 / avg).toFixed(2));
            lastLogTime = now;

            deltaTimes.length = 0;
        }
    }
    lastTime = now;
});
// hideHUD();

commsHandler.registerEvent('set-setting', (_: any, arg: string) => {
    console.log("set-setting: ", arg)
    const [key, value] = JSON.parse(arg);

    SettingsValue.set(key, value);
});

commsHandler.registerEvent('settings', (_: any, arg: string) => {
    console.log("settings: ", arg);
    SettingsValue.loadSettings(JSON.parse(arg));
});

commsHandler.sendCommand('load-settings');

document.addEventListener('DOMContentLoaded', () => {

    for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
        addTransformable(id);
    }

    requestLayout();
});
