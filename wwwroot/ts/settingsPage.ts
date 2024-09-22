import {
    CHECK_FOR_UPDATES,
    PRESSURE_UNITS,
    RADAR_BEEP_VOLUME,
    RADAR_RANGE,
    SPEED_UNITS,
    TransformableId,
    TRANSFORMABLES
} from "./consts";
import ChoiceSetting from "./settingComponents/ChoiceSetting";
import SettingComponent from "./settingComponents/SettingComponent";
import SliderSetting from "./settingComponents/SliderSetting";
import ToggleSetting from "./settingComponents/ToggleSetting";
import {enableLogging} from "./utils";
import PlatformHandler from './platform/PlatformHandler';


PlatformHandler.getInstance("settings:18").then(async instance => {
  await instance.Connect()
  enableLogging('settingsPage');
  instance.registerEvent('version', (_: any, v: string) => {
    const version = document.getElementById('version');
    version.innerText = 'v' + v;
  });

  instance.registerEvent('settings', (_: any, arg: string[]) => {
    loadSettings(JSON.parse(arg[0]));
  });

  instance.registerEvent('hud-layouts', (_: any, layoutsJson: string[]) => {
    const editLayout = document.getElementById('edit-layout');
    if (editLayout.innerText === SAVE_TEXT) {
      console.warn('Cannot load hud layouts while in edit mode.');
      return;
    }
    const layouts: HudLayout[] = JSON.parse(layoutsJson[0]);
    hudLayouts = layouts;
    const layoutTabs = document.getElementById(layoutTabsIdClass);
    for (let i = layoutTabs.children.length - 1; i >= 0; i--) {
      const node = layoutTabs.children[i];
      if (node.id !== 'new-layout-preset') {
        node.remove();
      }
    }
    layouts.forEach(processHudLayout);
  });

  instance.sendCommand('get-hud-layout');

  instance.registerEvent('discard-name-change', (_: any, arg: string[]) => {
    if (activeLayout == null) return;

    activeLayout.name = arg[0];
    const input = getActivePresetButton(true) as HTMLSpanElement;
    input.innerText = arg[0];
  });
})


export type Writeable<T> = {-readonly [P in keyof T]: T[P]};

/**
 * format: [left, top, scale, shown]
 */
export type HudLayout = {
  name: string;
  active: boolean;
  isReplayLayout: boolean;
  elements: HudLayoutElements;
};
export type HudLayoutElements = {
  [key in Writeable<TransformableId>]?: {
    left: number;
    top: number;
    scale: number;
    shown: boolean;
  };
};

type SpeedUnits = 'kmh' | 'mph';
type PressureUnits = 'kPa' | 'psi';

type Settings = {
  [CHECK_FOR_UPDATES]?: boolean,
  [SPEED_UNITS]?: SpeedUnits,
  [PRESSURE_UNITS]?: PressureUnits,
  [RADAR_RANGE]?: number,
  [RADAR_BEEP_VOLUME]?: number,
};

let settings: Settings = {};

const layoutTabsIdClass = 'layout-preset-tabs';

let activeLayout: HudLayout = null;
let hudLayouts: HudLayout[] = [];


type CallbackMap = {[key: string]: (value: any) => void};

const loadSettingsMap: CallbackMap = {};


/**
 * Callbacks for when a setting is changed.
 */
const valueChangeCallbacks: CallbackMap = {
  [CHECK_FOR_UPDATES]: checkForUpdates,
  isReplayLayout: (_) => {
    return false;
  },
};


customElements.define(SliderSetting.elementName, SliderSetting)
customElements.define(ChoiceSetting.elementName, ChoiceSetting)
customElements.define(ToggleSetting.elementName, ToggleSetting)


let domContentLoaded = false;
document.addEventListener('DOMContentLoaded', () => {
  domContentLoaded = true;
  document.body.spellcheck = false;
});

function loadSettings(newSettings: Settings = null) {
    if (newSettings === null) {
        PlatformHandler.getInstance("loadSettings").then(instance => {
          instance.sendCommand('load-settings');
        })
    return;
  }
  settings = newSettings;

  const load = () => {
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      if (settings.hasOwnProperty(key)) {
        if (loadSettingsMap.hasOwnProperty(key)) {
          // @ts-ignore
          loadSettingsMap[key](settings[key]);
        }
      }
    }

    SettingComponent.initialize(settings, valueChangeCallbacks);
  }

  if (domContentLoaded) {
    load();
  } else {
    document.addEventListener('DOMContentLoaded', load);
  }
}

function getActivePresetButton(input: boolean = false) {
  return document.querySelector(`#${layoutTabsIdClass} > button.active` + (input ? ' > span' : ''));
}


function tabChange(event: MouseEvent, tabClass: string, tabId: string, hasContent: boolean = true) {
  let i, tabcontent, tablinks;

  if (hasContent) {
    // This is to clear the previous clicked content.
    tabcontent = document.getElementsByClassName('tabcontent ' + tabClass);
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].classList.remove('active');
    }
  }

  // Set the tab to be 'active'.
  tablinks = document.getElementsByClassName('tablinks ' + tabClass);
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }

  if (hasContent) {
    // Display the clicked tab and set it to active.
    const tabContent = document.getElementById(tabId);
    tabContent.classList.add('active');
  }

  if (event.currentTarget instanceof HTMLElement) { // always true but otherwise TS complains
    event.currentTarget.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const elementToggles = document.getElementById('element-toggles');
  elementToggles.innerHTML = '';
  for (const key of Object.keys(TRANSFORMABLES) as TransformableId[]) {
    const toggleContainer = document.createElement('div');
    toggleContainer.classList.add('element-toggle');
    toggleContainer.id = key;
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = activeLayout?.elements?.[key]?.shown ?? true;
    toggle.disabled = true;
    toggle.onchange = toggleElement;

    const label = document.createElement('label');
    label.innerText = TRANSFORMABLES[key];
    label.htmlFor = key;

    toggleContainer.appendChild(toggle);
    toggleContainer.appendChild(label);

    elementToggles.appendChild(toggleContainer);
  }

  const onclick = [
    {id: 'edit-layout', func: () => lockOverlay(true)},
    {id: 'cancel-reset-layout', func: () => lockOverlay(false)},
    {id: 'show-log-file', func: () => PlatformHandler.getInstance().then(instance => instance.sendCommand('show-log-file'))},
    {id: 'general-tablink', func: (event: MouseEvent) => tabChange(event, 'main-tabs', 'general-tab')},
    {id: 'layout-tablink', func: (event: MouseEvent) => tabChange(event, 'main-tabs', 'layout-tab')},
    {id: 'new-layout-preset', func: () => PlatformHandler.getInstance().then(instance => instance.sendCommand('new-hud-layout'))},
  ];


  const oninput: {id: string, func: (e: HTMLInputElement) => void}[] = [];

  onclick.forEach((o) => {
    document.getElementById(o.id)?.addEventListener('click', o.func);
  });
  oninput.forEach((o) => {
    const element: HTMLInputElement = document.querySelector("#" + o.id);
    if (element != null) {
      element.addEventListener('input', () => o.func(element));
    }
  });
});


const EDIT_TEXT = 'Edit';
const SAVE_TEXT = 'Save';
const CANCEL_TEXT = 'Cancel';
const RESET_TEXT = 'Reset';
async function lockOverlay(save: boolean) {
  const element = document.getElementById('edit-layout');
  const didEdit = element.innerText === EDIT_TEXT; // entered edit mode
  if(didEdit){ // making sure current hud is always loaded when editing
    PlatformHandler.getInstance().then(instance => instance.sendCommand('get-hud-layout'));
  }
  const cancelResetButton = document.getElementById('cancel-reset-layout');

  const isReplayLayout = document.getElementById('isReplayLayout') as ToggleSetting;
  if (didEdit) {
    isReplayLayout.enable();
  } else {
    isReplayLayout.disable();
  }

  const presetTabs = document.querySelectorAll(`#${layoutTabsIdClass} > button`);
  for (const element of presetTabs) {
    const button = element as HTMLButtonElement;
    if (button.id !== 'new-layout-preset') {
      if (didEdit) {
        if (button.classList.contains('active')) {
          (button.children[0] as HTMLSpanElement).contentEditable = 'true';
        }
      } else {
        (button.children[0] as HTMLSpanElement).contentEditable = 'false';
      }
    } else if (didEdit) {
      (button.children[0] as HTMLSpanElement).classList.add('disabled');
    } else {
      (button.children[0] as HTMLSpanElement).classList.remove('disabled');
    }
    button.disabled = didEdit;
  }

  if (save && !didEdit) { // save clicked
    const newName = (getActivePresetButton(true) as HTMLSpanElement).innerText;
    if (activeLayout != null && activeLayout.name !== newName) {
      PlatformHandler.getInstance().then(instance => instance.sendCommand('update-preset-name', [activeLayout.name, newName]));
      activeLayout.name = newName;
    }

    const newIsReplayLayout = isReplayLayout.getValue();
    if (activeLayout != null && activeLayout.isReplayLayout !== newIsReplayLayout) {
      PlatformHandler.getInstance().then(instance => instance.sendCommand('update-preset-is-replay', [activeLayout.name, newIsReplayLayout]));
      activeLayout.isReplayLayout = newIsReplayLayout;
    }
  }

  if (!save && cancelResetButton.innerText === RESET_TEXT) { // reset clicked
    PlatformHandler.getInstance().then(instance => instance.sendCommand('reset-active-layout', null));
  }

  const toggles = document.querySelectorAll('.element-toggle input');
  toggles.forEach((toggle) => {
    if (toggle instanceof HTMLInputElement)
      toggle.disabled = !didEdit;
  });

  setTimeout(() => {
    PlatformHandler.getInstance().then(instance => instance.sendCommand('lock-overlay', [!didEdit, save]));
  }, 150);

  if (!didEdit){
    PlatformHandler.getInstance().then(instance => instance.sendCommand("set-hud-layout", JSON.stringify(activeLayout.elements)));
  }

  if (didEdit) {
    element.innerText = SAVE_TEXT;
    cancelResetButton.innerText = CANCEL_TEXT;
  } else {
    element.innerText = EDIT_TEXT;
    cancelResetButton.innerText = RESET_TEXT;
  }
}


let didCheckForUpdates = false;
function checkForUpdates(val: boolean) {
  if (val) {
    !didCheckForUpdates && PlatformHandler.getInstance().then(instance => instance.sendCommand(CHECK_FOR_UPDATES));
    didCheckForUpdates = true;
  }
}


function toggleElement(event: Event) {
  // @ts-ignore
  const element: HTMLInputElement = event.target;
  const elementId = element.parentElement.id;

  let hudElement = activeLayout.elements[elementId as keyof HudLayoutElements];
  if (hudElement === undefined) {
    hudElement = activeLayout.elements[elementId as keyof HudLayoutElements] = {
      left: 0,
      top: 0,
      scale: 1,
      shown: true,
    };
  }
  hudElement.shown = element.checked;

  PlatformHandler.getInstance().then(instance => instance.sendCommand('toggle-element', [elementId, element.checked]));
}

function processHudLayout(hudLayout: HudLayout) {
  const layoutTabs = document.getElementById(layoutTabsIdClass);

  const tab = document.createElement('button');
  tab.classList.add('tablinks', layoutTabsIdClass);

  const input = document.createElement('span');
  input.classList.add('layout-name');
  input.innerText = hudLayout.name;
  input.contentEditable = 'false';
  input.addEventListener('keypress', (evt) => {
    if (evt.key === 'Enter') {
      evt.preventDefault();
    }
  });

  const deleteBtn = document.createElement('span');
  deleteBtn.classList.add('material-symbols-outlined', 'icon-button', 'delete-preset');
  deleteBtn.innerText = 'delete';
  deleteBtn.addEventListener('click', () => {
    PlatformHandler.getInstance().then(instance => {
      instance.sendCommand('delete-hud-layout', hudLayout.name);
    })
  });

  tab.appendChild(input);
  tab.appendChild(deleteBtn);
  tab.addEventListener('click', (event) => {
    loadLayout(hudLayout);
    if ((event.currentTarget as HTMLButtonElement).classList.contains('active')) return;
    tabChange(event, layoutTabsIdClass, hudLayout.name, false);
    PlatformHandler.getInstance().then(instance => {
      instance.sendCommand('set-hud-layout', hudLayout.name);
    })
  });
  layoutTabs.insertBefore(tab, document.getElementById('new-layout-preset'));

  if (hudLayout.active) {
    tab.classList.add('active');

    loadLayout(hudLayout);
  }
}
function loadLayout(layout: HudLayout) {
  activeLayout = layout;

  const isReplayLayout = document.getElementById('isReplayLayout') as ToggleSetting;
  isReplayLayout.setValue(layout.isReplayLayout);
  
  layout.active = true;
  hudLayouts.forEach((l) => {
    if (l.name !== layout.name) {
      l.active = false;
    }
  });

  for (const id of Object.keys(TRANSFORMABLES) as TransformableId[]) {
    // @ts-ignore
    const element: HTMLInputElement =
      document.getElementById(id)?.children?.[0];
    if (!element) continue;
    if (layout.elements?.[id]?.shown === false) {
      element.checked = false;
    } else {
      element.checked = true;
    }
  }
}
