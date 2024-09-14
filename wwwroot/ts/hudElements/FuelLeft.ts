import HudElement from "./HudElement";
import {NA, valueIsValidAssertNull} from "../consts";
import {EEngineType, IDriverInfo} from '../r3eTypes';

export default class FuelLeft extends HudElement {
  override sharedMemoryKeys: string[] = ['vehicleInfo', 'fuelLeft', 'batterySoC'];

  protected override render(vehicleInfo: IDriverInfo, fuelLeft: number, battery: number): string {
    if (vehicleInfo.engineType === EEngineType.Electric) {
        fuelLeft = battery;
    }
    return valueIsValidAssertNull(fuelLeft) ? `${fuelLeft.toFixed(1)}` : NA;
  }
}