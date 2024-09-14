import HudElement, {Hide} from "./HudElement";
import {NA, valueIsValidAssertNull} from "../consts";

export default class CompletedLaps extends HudElement {
    override sharedMemoryKeys: string[] = ['completedLaps'];

    protected override render(completedLaps: number): string | Hide {
        if (!valueIsValidAssertNull(completedLaps))
            return this.hide(NA);

        return `${completedLaps}`;
    }
}