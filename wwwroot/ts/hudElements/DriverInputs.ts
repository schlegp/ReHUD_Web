import HudElement from "./HudElement";
import {validNumberOrDefault, valueIsValidAssertNull} from "../consts";
import {SetCustomProgress} from "../utils";

export default class DriverInputs extends HudElement {
    override sharedMemoryKeys: string[] = ['throttleRaw', 'throttle', 'brakeRaw', 'brake', 'clutchRaw', 'clutch', 'steerInputRaw', 'steerWheelRangeDegrees'];

    private static rawOrReal(n: number, r: number): number {
        return validNumberOrDefault(n, validNumberOrDefault(r, 0));
    }

    protected override render(tRaw: number, t: number, bRaw: number, b: number, cRaw: number, c: number, sRaw: number, sRange: number): null {
        const throttle = document.getElementById('throttle-input');
        const brake = document.getElementById('brake-input');
        const clutch = document.getElementById('clutch-input');
        const throttleProgress: HTMLInputElement = document.querySelector('#throttle-progress .progress-value');
        const brakeProgress: HTMLInputElement = document.querySelector('#brake-progress .progress-value');
        const clutchProgress: HTMLInputElement = document.querySelector('#clutch-progress .progress-value');

        const steer = document.getElementById('steering-wheel');

        tRaw = DriverInputs.rawOrReal(tRaw, t);
        bRaw = DriverInputs.rawOrReal(bRaw, b);
        cRaw = DriverInputs.rawOrReal(cRaw, c);
        sRaw = sRaw ?? 0;
        sRange = valueIsValidAssertNull(sRange) ? sRange : 360;

        throttle.innerText = `${Math.round(tRaw * 100)}`;
        brake.innerText = `${Math.round(bRaw * 100)}`;
        clutch.innerText = `${Math.round(cRaw * 100)}`;

        SetCustomProgress(throttleProgress, 1, tRaw, false);
        SetCustomProgress(brakeProgress, 1, bRaw, false);
        SetCustomProgress(clutchProgress, 1, cRaw, false);

        const steerAngle = sRaw * sRange / 2;
        steer.style.transform = `rotate(${steerAngle}deg)`;

        return null;
    }
}