import HudElement from "./HudElement";
import {allValuesAreValid, NA} from "../consts";

export default class FuelToEnd extends HudElement {
    override sharedMemoryKeys: string[] = ['+lapsUntilFinish', '+fuelPerLap'];

    protected override render(fuelLeft: number, fuelPerLap: number): string {
        if (!allValuesAreValid(fuelLeft, fuelPerLap))
            return NA;
        return `${(fuelLeft * fuelPerLap).toFixed(1)}`;
    }
}