import HudElement from "./HudElement";
import {NA, valueIsValidAssertNull} from "../consts";

export default class EngineBraking extends HudElement {
    override sharedMemoryKeys: string[] = ['engineBrakeSetting'];

    protected override render(eb: number): string {
        return `EB: ${valueIsValidAssertNull(eb) ? eb : NA}`
    }
}