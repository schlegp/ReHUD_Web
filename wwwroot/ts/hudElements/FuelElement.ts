import HudElement, {Hide} from "./HudElement";
import {valueIsValidAssertNull} from "../consts";

export default class FuelElement extends HudElement {
    override sharedMemoryKeys: string[] = ['fuelUseActive'];

    protected override render(fuelUseActive: number): string | Hide {
        if (valueIsValidAssertNull(fuelUseActive) && fuelUseActive > 0) {
            return null;
        }
        return this.hide();
    }
}