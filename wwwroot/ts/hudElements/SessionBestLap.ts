import HudElement from "./HudElement";
import {laptimeFormat} from "../consts";

export default class SessionBestLap extends HudElement {
    override sharedMemoryKeys: string[] = ['lapTimeBestSelf'];

    protected override render(laptime: number): string {
        return laptimeFormat(laptime);
    }
}