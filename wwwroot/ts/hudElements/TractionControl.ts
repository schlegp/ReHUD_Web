import HudElement, {Hide, Style} from "./HudElement";
import {NA, valueIsValidAssertNull} from "../consts";

export default class TractionControl extends HudElement {
    override sharedMemoryKeys: string[] = ['tractionControlSetting', 'tractionControlPercent'];

    protected override render(tcPreset: number, tcPercent: number): string | Style | Hide {
        if (valueIsValidAssertNull(tcPreset) && !valueIsValidAssertNull(tcPercent)) {
            return 'TC6';
        }
        if (!valueIsValidAssertNull(tcPreset)) {
            return 'TC: ' + NA;
        }
        return `TC${tcPreset}: ${Math.round(tcPercent)}%`;
    }
}