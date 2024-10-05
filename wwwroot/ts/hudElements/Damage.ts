import HudElement, {Hide} from "./HudElement";
import {ICarDamage} from "../r3eTypes";
import {SetCustomProgress} from "../utils";

export default class Damage extends HudElement {
    override sharedMemoryKeys: string[] = ['carDamage'];

    protected override render(damage: ICarDamage): Hide | null {
        const parts = ['engine', 'transmission', 'suspension', 'aerodynamics'] as const;
        for (const part of parts) {
            const element: HTMLInputElement = document.querySelector(`#${part}-damage .progress-value`);
            let value = damage[part];
            if (value == null)
                value = 0;

            if (value == -1)
                return this.hide();

            element.value = value.toString();
            SetCustomProgress(element, 1, value, true);

            this.root.style.setProperty(`--${part}-damage-color`, value == 1 ? 'var(--damage-color-ok)' : 'var(--damage-color-partial)');
            this.root.style.setProperty(`--${part}-damage-text-color`, value == 0 ? 'var(--damage-color-full)' : 'var(--damage-color-ok)');
        }

        return null;
    }
}