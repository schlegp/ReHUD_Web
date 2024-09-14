import HudElement from "./HudElement";
import {allValuesAreValid, NA, timeFormat} from "../consts";
import {EEngineType, IDriverInfo} from '../r3eTypes';

export default class FuelTimeLeft extends HudElement {
    override sharedMemoryKeys: string[] = ['vehicleInfo', 'fuelLeft', 'batterySoC', '+fuelPerLap', '+averageLapTime'];

    protected override render(vehicleInfo: IDriverInfo, fuelLeft: number, battery: number, fuelPerLap: number, averageLapTime: number): string {
        if (vehicleInfo.engineType === EEngineType.Electric) {
            fuelLeft = battery;
        }
        if (!allValuesAreValid(fuelLeft, fuelPerLap, averageLapTime))
            return NA;

        const time = fuelLeft / fuelPerLap * averageLapTime;
        return timeFormat(time);
    }
}