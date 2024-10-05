import HudElement from "./HudElement";
import {ESessionPhase, EStartLights} from "../r3eTypes";

export default class StartLights extends HudElement {
    override  sharedMemoryKeys: string[] = ['startLights', 'sessionTimeDuration', 'sessionTimeRemaining'];
    private greenCounter: number = 0;
    private greenTone: string = "green";

    protected  override  render(startLights: EStartLights, sessionTimeDuration: number, sessionTimeRemaining: number): null{
        const elapsedTime = sessionTimeDuration - sessionTimeRemaining;
        // console.log('Elapsed Time: '+elapsedTime);
        let colors = ['transparent', 'transparent', 'transparent', 'transparent', 'transparent'];
        const circles = document.querySelectorAll('.circle');
        if (elapsedTime >= 3 || startLights === EStartLights.Unavailable){
            if ((circles[0] as HTMLInputElement).style.backgroundColor != 'transparent'){
                circles.forEach((circle: HTMLInputElement, index) => {
                    circle.style.backgroundColor = colors[index];
                });
            }
            return null;
        }
        switch (startLights) {
            case EStartLights.Off:
                colors = ['grey', 'grey', 'grey', 'grey', 'grey'];
                break;
            case EStartLights.OneLight:
                colors = ['red', 'grey', 'grey', 'grey', 'grey'];
                break;
            case EStartLights.TwoLights:
                colors = ['red', 'red', 'grey', 'grey', 'grey'];
                break;
            case EStartLights.ThreeLights:
                colors = ['red', 'red', 'red', 'grey', 'grey'];
                break;
            case EStartLights.FourLights:
                colors = ['red', 'red', 'red', 'red', 'grey'];
                break;
            case EStartLights.FiveLights:
                colors = ['red', 'red', 'red', 'red', 'red'];
                break;
            case EStartLights.Green:
                if(this.greenCounter <= 30){
                    this.greenCounter++;
                } else {
                    this.greenTone = this.greenTone == 'green' ? 'lightgreen' : 'green';
                    this.greenCounter = 0;
                }
                    colors = [this.greenTone, this.greenTone, this.greenTone, this.greenTone, this.greenTone];
                break;
            default:
                break;
        }
        circles.forEach((circle: HTMLInputElement, index) => {
            circle.style.backgroundColor = colors[index];
        });
        return null;
    }
}