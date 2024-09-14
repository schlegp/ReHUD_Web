import HudElement, {Hide, Style} from "./HudElement";
import {INC_POINTS_RED_THRESHOLD, NA, valueIsValidAssertNull} from "../consts";

export default class IncidentPoints extends HudElement {
    override sharedMemoryKeys: string[] = ['incidentPoints', 'maxIncidentPoints'];

    protected override render(incidentPoints: number, maxIncidentPoints: number): string | Style | null | Hide {
        if (maxIncidentPoints === 0)
            maxIncidentPoints = -1;
        if (!valueIsValidAssertNull(incidentPoints))
            return this.hide(NA);

        let res = incidentPoints.toString();
        if (valueIsValidAssertNull(maxIncidentPoints)) {
            res += `/${maxIncidentPoints}`;
        }
        return this.style(res, {color: (valueIsValidAssertNull(maxIncidentPoints) && maxIncidentPoints - incidentPoints < INC_POINTS_RED_THRESHOLD) ? 'red' : 'white'});
    }
}