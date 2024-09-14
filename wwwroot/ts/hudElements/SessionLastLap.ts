import HudElement from "./HudElement";
import {laptimeFormat} from "../consts";

export default class SessionLastLap extends HudElement {
    override sharedMemoryKeys: string[] = ['lapTimePreviousSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}
