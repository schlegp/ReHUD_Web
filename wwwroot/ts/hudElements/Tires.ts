import HudElement from "./HudElement";
import SettingsValue from "../SettingsValue";
import {convertPressure, lerpRGB3, NA, PRESSURE_UNITS, validOrDefault, valueIsValidAssertNull} from "../consts";
import {IBrakeTemp, ITireData, ITireTemp} from "../r3eTypes";
import {SetCustomProgress} from "../utils";

export default class Tires extends HudElement {
    override sharedMemoryKeys: string[] = ['tireTemp', 'tireWear', 'brakeTemp', 'tireDirt', 'tirePressure'];

    protected override render(tireTemp: ITireData<ITireTemp>, tireWear: ITireData<number>, brakeTemp: ITireData<IBrakeTemp>, tireDirt: ITireData<number>, tirePressure: ITireData<number>): null {

        const nameMap = {
            'frontLeft': 'front-left',
            'frontRight': 'front-right',
            'rearLeft': 'rear-left',
            'rearRight': 'rear-right',
        } as const;

        const averageWear = this.hud?.tireManagerService?.getAverageWear();

        for (const tire of Object.keys(nameMap) as (keyof typeof nameMap)[]) {
            const name = nameMap[tire];

            const optimal = tireTemp[tire].optimalTemp;
            const cold = tireTemp[tire].coldTemp;
            const hot = tireTemp[tire].hotTemp;

            const optimalBrake = brakeTemp[tire].optimalTemp;
            const coldBrake = brakeTemp[tire].coldTemp;
            const hotBrake = brakeTemp[tire].hotTemp;
            const currentBrake = brakeTemp[tire].currentTemp;

            const wear = validOrDefault(tireWear[tire], 0); // undefined - puncture
            const dirt = validOrDefault(tireDirt[tire], 0);
            const pressure = convertPressure(tirePressure[tire], SettingsValue.get(PRESSURE_UNITS));
            
            const sides = ['left', 'center', 'right'] as const;
            for (let i = 1; i <= 3; i++) {

                const customProgress: HTMLInputElement = document.querySelector(`#${name}-${i} .progress-value`);
                    SetCustomProgress(customProgress, 1, wear, false);
                const side = sides[i - 1];
                const text = document.getElementById(`${name}-temp-${i}`);
                // const progress: HTMLInputElement = document.querySelector(`#${name}-${i} progress`);
                // progress.value = wear;
                const span = document.getElementById(`${name}-wear`);
                span.innerText = `${Math.round(wear * 100)}%`;
                if (pressure == null)
                    span.setAttribute('data-before', '');
                else
                    span.setAttribute('data-before', pressure + SettingsValue.get(PRESSURE_UNITS));
                
                if (averageWear != null) {
                    span.setAttribute('data-after', `${(averageWear[tire] * 100).toFixed(1)}pL`);
                } else {
                    span.setAttribute('data-after', '');
                }

                const temp = tireTemp?.[tire]?.currentTemp?.[side];

                if (temp == undefined) {
                    text.innerText = NA;
                    this.root.style.setProperty(`--${name}-${i}-color`, 'var(--temp-color-normal)');
                    continue;
                }

                text.innerText = `${Math.round(temp)}°`;

                if (!valueIsValidAssertNull(optimal) || !valueIsValidAssertNull(cold) || !valueIsValidAssertNull(hot) || !valueIsValidAssertNull(temp)) {
                    this.root.style.setProperty(`--${name}-${i}-color`, 'var(--temp-color-normal)');
                    continue;
                }
                const tireColor = lerpRGB3([0, 0, 200], [0, 200, 0], [200, 0, 0], (optimal - cold) / (hot - cold), (temp - cold) / (hot - cold));
                if(customProgress)
                    customProgress.style.backgroundColor = tireColor;

                this.root.style.setProperty(`--${name}-${i}-color`, tireColor);

                if (!valueIsValidAssertNull(optimalBrake) || !valueIsValidAssertNull(coldBrake) || !valueIsValidAssertNull(hotBrake) || !valueIsValidAssertNull(currentBrake)) {
                    this.root.style.setProperty(`--${name}-brake-color`, 'var(--temp-color-normal)');
                    continue;
                }
                this.root.style.setProperty(`--${name}-brake-color`, lerpRGB3([0, 0, 200], [0, 200, 0], [200, 0, 0], (optimalBrake - coldBrake) / (hotBrake - coldBrake), (currentBrake - coldBrake) / (hotBrake - coldBrake)));


                const blackLevel = 0.05;
                // 3 to 5
                this.root.style.setProperty(`--dirty-${name}-size`, dirt < blackLevel ? '1px' : `${dirt * 2 + 3}px`);
                this.root.style.setProperty(`--dirty-${name}-color`, dirt < blackLevel ? `black` : lerpRGB3([60, 20, 20], [130, 50, 50], [255, 50, 50], 0.15, (dirt - blackLevel) / 0.9));
            }
        }

        return null;
    }
}