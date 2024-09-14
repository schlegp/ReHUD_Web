import HudElement, {Style} from "./HudElement";
import {laptimeFormat, valueIsValidAssertNull} from "../consts";
import Driver from '../Driver';

export default class CurrentLaptime extends HudElement {
    override sharedMemoryKeys: string[] = ['lapTimeCurrentSelf'];

    protected override render(laptime: number): Style {
        if (!valueIsValidAssertNull(laptime)) {
            const currentTime = Driver.mainDriver?.getCurrentTime();
            return this.style(laptimeFormat(currentTime, true), {
                color: 'red',
            });
        }
        return this.style(laptimeFormat(laptime, true), {
            color: 'white',
        });
    }
}
