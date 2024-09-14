import HudElement, {Hide} from "./HudElement";
import {NA} from "../consts";
import {IDrs} from "../r3eTypes";

export default class Rake extends HudElement {
    override sharedMemoryKeys: string[] = ['drs'];

    protected override render(drs: IDrs): string | Hide {
        if (drs.equipped == 0) {
            return this.hide(NA);
        }

        const drsLeft = drs.numActivationsLeft;
        const drsActive = drs.engaged;
        const p2pElement = document.getElementById('drs-symbol');

        if (drsActive > 0) {
            p2pElement.style.backgroundColor = 'blue';
        } else if (drsLeft > 0) {
            p2pElement.style.backgroundColor = 'green';
        } else {
            p2pElement.style.backgroundColor = '';
        }

        return drsLeft > 100 ? "∞" : drsLeft.toString();
    }
}