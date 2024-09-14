import HudElement from "./HudElement";
import {NA, valueIsValidAssertNull} from "../consts";

export default class BrakeBias extends HudElement {
    override sharedMemoryKeys: string[] = ['brakeBias'];

    protected override render(bb: number): string {
        return `BB: ${valueIsValidAssertNull(bb) ? (100 - bb * 100).toFixed(1) : NA}%`
    }
}