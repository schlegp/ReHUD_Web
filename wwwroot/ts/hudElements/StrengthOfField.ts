import HudElement, {Hide} from "./HudElement";
import {IDriverData} from "../r3eTypes";
import {NA} from "../consts";

export default class StrengthOfField extends HudElement {
    override sharedMemoryKeys: string[] = ['driverData'];

    protected override render(drivers: IDriverData[]): string | Hide {
        let rankings = drivers.map(driver => this.hud.rankedDataService.getRankedDataForDriver(driver));

        if (rankings.length === 0 || rankings.some(r => r === null))
            return this.hide(NA);

        return (rankings.reduce((acc, val) => acc + val.Rating, 0) / rankings.length).toFixed(0);
    }
}