import HudElement, {Hide} from "./HudElement";
import {finished, NA, valueIsValidAssertNull} from "../consts";
import IShared, {EFinishStatus, ESession, IDriverData} from "../r3eTypes";

export default class EstimatedLapsLeft extends HudElement {
    override sharedMemoryKeys: string[] = ['sessionType', 'finishStatus', 'completedLaps', 'lapDistanceFraction', 'sessionLengthFormat', '+estimatedRaceLapCount'];

    private crossedFinishLine: number = 0;

    protected override render(sessionType: ESession, finishStatus: EFinishStatus, completedLaps: number, fraction: number, sessionLengthFormat: number, totalLaps: number): string | Hide {
        if (sessionType !== ESession.Race || !valueIsValidAssertNull(totalLaps) || finished(finishStatus) || !valueIsValidAssertNull(sessionLengthFormat)) {
            return this.hide(NA);
        }

        this.crossedFinishLine = Math.max(this.crossedFinishLine, completedLaps);

        if (!valueIsValidAssertNull(fraction)) {
            fraction = 0;
        }
        if (this.crossedFinishLine == 0 || !valueIsValidAssertNull(completedLaps)) {
            completedLaps = 0;
            totalLaps--; // in the backend, completedLaps is 0 before the start, so you get an extra lap calculated (the one you'll "complete" when crossing the start line)
        } else {
            completedLaps += fraction;
        }
        completedLaps = Math.max(completedLaps, 0);

        if (sessionLengthFormat === 2 && this.hud.driverManagerService.leaderCrossedSFLineAt0 === 1) {
            totalLaps--;
        }

        return `${(totalLaps - completedLaps).toFixed(1)}/${totalLaps}`;
    }

    protected override onNewLap(data: IShared, driver: IDriverData, isMainDriver: boolean): void {
        if (isMainDriver) {
            this.crossedFinishLine++;
        }
    }
    protected override onSessionChange(data: IShared, lastSession: ESession): void {
        this.crossedFinishLine = 0;
    }

    protected override onMainDriverChange(data: IShared, lastMainDriver: IDriverData): void {
        this.crossedFinishLine = 0;
    }
}