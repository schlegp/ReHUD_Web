import HudElement from "./HudElement";
import {laptimeFormat} from "../consts";
import Driver from '../Driver';

export default class AlltimeBestLap extends HudElement {
    override sharedMemoryKeys: string[] = [];

    protected override render(): string {
        if (Driver.mainDriver?.bestLapTime == null || !Driver.mainDriver?.bestLapTimeValid)
            return laptimeFormat(null);
        return laptimeFormat(Driver.mainDriver.bestLapTime);
    }
}