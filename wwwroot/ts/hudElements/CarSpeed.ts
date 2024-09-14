import HudElement from "./HudElement";
import SettingsValue from "../SettingsValue";
import {convertSpeed, SPEED_UNITS} from "../consts";

export default class CarSpeed extends HudElement {
    override sharedMemoryKeys: string[] = ['carSpeed'];

    protected override render(speed: number): string {
        return convertSpeed(speed, SettingsValue.get(SPEED_UNITS)).toString();
    }
}