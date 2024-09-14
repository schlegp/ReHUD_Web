import EventListener from "./EventListener";
import Hud from "./Hud";
import {RELATIVE_SAFE_MODE, valueIsValid} from "./consts";
import {ESession} from "./r3eTypes";
import SettingsValue from "./SettingsValue";

export default class Driver extends EventListener {
    override sharedMemoryKeys: string[] = []; // while this class does use shared memory, it's provided as single values by the driver manager, so it does not directly access the shared memory object
    override isEnabled(): boolean {
        return true;
    }

    static readonly MIN_LAP_TIME: number = 10; // seconds

    static pointsPerMeter = 0.5;
    static positionJumpThreshold = 150; // meters

    static mainDriver: Driver = null;
    static onMainDriverQeue: Array<(driver: Driver) => void> = [];

    userId: string;
    trackLength: number;
    points: number[];
    currentIndex: number = null;
    currentLapValid: boolean = true;
    lastLapTime: number = null;
    bestLap: number[] = null;
    sessionBestLap: number[] = null;
    bestLapTime: number = null;
    sessionBestLapTime: number = null;
    bestLapTimeValid: boolean = false;
    completedLaps: number = null;
    crossedFinishLine: number = null;
    previousDistance: number = -1;
    attemptedLoadingBestLap: boolean = false;

    /**
     * Represents a driver
     */
    constructor(userId: string, trackLength: number, completedLaps: number) {
        super(userId);
        this.userId = userId;
        this.trackLength = trackLength;
        this.completedLaps = completedLaps;

        this.points = this.newPointArray(); // points[distance] = time
    }

    /**
     * Sets the main driver (the one currently being viewed)
     */
    static setMainDriver(driver: Driver) {
        const newMainDriver = driver != Driver.mainDriver;

        if (newMainDriver) {
            console.log('Setting main driver to', driver.userId);
        };

        Driver.mainDriver = driver;

        for (const callback of Driver.onMainDriverQeue) {
            try {
                callback(driver);
            } catch (e) {
                console.error('Error while executing onMainDriver callback', e);
            }
        }
        Driver.onMainDriverQeue = [];

        if (
            !driver.attemptedLoadingBestLap &&
            (driver.bestLap == null || !driver.bestLapTimeValid)
        ) {
            driver.attemptedLoadingBestLap = true;
            return true;
        }
        return false;
    }

    static onMainDriver(callback: (driver: Driver) => void) {
        if (Driver.mainDriver != null) {
            callback(Driver.mainDriver);
            return;
        }
        Driver.onMainDriverQeue.push(callback);
    }

    /**
     * Sets the main driver to this driver.
     */
    setAsMainDriver() {
        return Driver.setMainDriver(this);
    }

    static loadBestLap(
        bestLapTime: number,
        points: number[],
        pointsPerMeter: number
    ) {
        this.onMainDriver((driver) => {
            let newPoints = driver.newPointArray();
            if (pointsPerMeter > Driver.pointsPerMeter) {
                for (let i = 0; i < newPoints.length; i++) {
                    newPoints[i] =
                        points[Math.floor((i / pointsPerMeter) * Driver.pointsPerMeter)];
                }
            } else {
                for (let i = 0; i < points.length; i++) {
                    newPoints[Math.floor((i / Driver.pointsPerMeter) * pointsPerMeter)] =
                        points[i];
                }
            }

            driver.bestLapTime = bestLapTime;
            driver.bestLap = newPoints;
            driver.bestLapTimeValid = true;

            console.log('Loaded saved best', driver.bestLapTime);
        });
    }

    /**
     * Initializes a new point array.
     */
    newPointArray(): Array<number> {
        return Array(Math.floor(this.trackLength * Driver.pointsPerMeter)).fill(
            null
        );
    }

    /**
     * Erases the temporary data of the driver.
     */
    clearTempData() {
        this.crossedFinishLine = null;
        this.currentIndex = null;
        this.setLapInvalid();
        this.points = this.newPointArray();
    }

    /**
     * Add a point to the delta path.
     * MUST BE CALLED AFTER `endLap` IF THE LAP IS COMPLETED.
     */
    addDeltaPoint(distance: number, completedLaps: number) {
        const time = Hud.getGameTimestamp();

        const newCurrentIndex = Math.floor(distance * Driver.pointsPerMeter);
        if (this.currentIndex == null) {
            this.currentIndex = newCurrentIndex;
        } else {
            const gapToSpot = newCurrentIndex - this.currentIndex;
            if (gapToSpot >= 0) {
                for (let i = 0; i < gapToSpot; i++) {
                    this.points[this.currentIndex + i + 1] = valueIsValid(this.currentIndex) ? this.points[this.currentIndex] + (time - this.points[this.currentIndex]) / gapToSpot * (i + 1) : time;
                }
                this.currentIndex = newCurrentIndex;
            } else if ((gapToSpot / Driver.pointsPerMeter) < -Driver.positionJumpThreshold) { // negative progress shouldn't happen, endLap is supposed to move currentIndex back to -1
                this.clearTempData();
            }
        }

        this.previousDistance = distance;
        this.completedLaps = completedLaps;
    }

    setLapInvalid() {
        this.currentLapValid = false;
    }

    /**
     * End the current lap.
     * MUST BE CALLED BEFORE `addDeltaPoint`.
     * @return Whether the best lap should be saved (new best valid lap, main driver)
     */
    endLap(laptime: number, completedLaps: number, sessionType: ESession): boolean {
        let shouldSaveBestLap = false;

        const time = Hud.getGameTimestamp();

        for (let i = this.currentIndex + 1; i < this.points.length; i++) {
            this.points[i] = this.points[this.currentIndex];
        }
        this.currentIndex = -1;

        if (this.crossedFinishLine != null && (sessionType !== ESession.Race || completedLaps > 1)) {
            if (!valueIsValid(laptime)) {
                laptime = time - this.points[0];
            }

            this.lastLapTime = laptime;

            if (!SettingsValue.get(RELATIVE_SAFE_MODE)) {
                if (laptime < Driver.MIN_LAP_TIME) {
                    console.warn(`Invalid lap time for`, this.userId, laptime);
                    this.setLapInvalid();
                } else {
                    let didUpdateBestLap = false;
                    if (this.bestLapTime == null || (laptime < this.bestLapTime && (this.currentLapValid || !this.bestLapTimeValid))) {
                        if (this.currentLapValid && Driver.mainDriver === this) {
                            shouldSaveBestLap = true;
                        }
                        if (shouldSaveBestLap || this.completedLaps >= 0) {
                            this.bestLap = this.points.slice();
                            this.bestLapTime = laptime;
                            this.bestLapTimeValid = this.currentLapValid;

                            console.log('New best lap for', this.userId, laptime, this.bestLapTimeValid);
                            didUpdateBestLap = true;
                        }
                    }

                    if (this.currentLapValid && (this.sessionBestLapTime == null || laptime < this.sessionBestLapTime)) {
                        this.sessionBestLap = this.points.slice();
                        this.sessionBestLapTime = laptime;

                        if (!didUpdateBestLap) {
                            console.log('New session best for', this.userId, laptime);
                        }
                    }
                }
            }
        }

        this.crossedFinishLine = Hud.getGameTimestamp();
        this.currentLapValid = true;

        return shouldSaveBestLap;
    }

    /**
     * Save the best lap (locally)
     */
    saveBestLap(
        layoutId: number,
        carClassId: number,
    ) {
        Hud.hub.invoke('SaveBestLap', layoutId, carClassId, this.bestLapTime, this.bestLap, Driver.pointsPerMeter);
    }

    /**
     * Get a relative time delta to another driver on track (positions are based on the last delta points).
     */
    getDeltaToDriverAhead(
        driver: Driver,
    ): number {
        const thisLapDistance = this.currentIndex;
        const otherLapDistance = driver.currentIndex;

        if (thisLapDistance == null || otherLapDistance == null) return null;

        if (
            (Driver.mainDriver === this || Driver.mainDriver === driver) &&
            Driver.mainDriver.bestLap != null
        ) {
            const res = Driver.mainDriver.deltaBetweenPoints(
                thisLapDistance,
                otherLapDistance,
                true,
                false
            );

            if (res != null && res >= 0) {
                if (otherLapDistance < thisLapDistance)
                    return Driver.mainDriver.getEstimatedLapTime() - res;
                return res;
            }
        }

        if (otherLapDistance < thisLapDistance) {
            let res;
            let estimatedLapTime =
                this.getEstimatedLapTime() || driver.getEstimatedLapTime();

            res = driver.deltaBetweenPoints(otherLapDistance, thisLapDistance, false);
            if (res != null) return res;

            if (estimatedLapTime == null) return null;

            const delta = driver.getDeltaToDriverAhead(this);
            res = estimatedLapTime - delta;
            if (delta == null || res < 0) return null;

            return res;
        } else {
            let res = this.deltaBetweenPoints(
                thisLapDistance,
                otherLapDistance,
                true,
                false
            );
            if (res == null) {
                res = driver.deltaBetweenPoints(thisLapDistance, otherLapDistance);
            }
            return res;
        }
    }

    getDeltaToDriverBehind(
        driver: Driver,
    ): number {
        return driver.getDeltaToDriverAhead(this);
    }

    /**
     * The delta between two points on the track (distances).
     * Calculated using either the current lap or the best lap.
     */
    deltaBetweenPoints(
        point1: number,
        point2: number,
        useBestLap: boolean = true,
        fallbackToCurrentLap: boolean = true
    ): number {
        let usingBestLap = false;
        let lapData;
        if (useBestLap && this.bestLap != null) {
            lapData = this.bestLap;
            usingBestLap = true;
        } else if (fallbackToCurrentLap) {
            lapData = this.points;
        } else {
            return null;
        }

        const point1Time = lapData[point1];
        const point2Time = lapData[point2];

        if (point1Time == null || point2Time == null) {
            if (usingBestLap && fallbackToCurrentLap) {
                return this.deltaBetweenPoints(point1, point2, false);
            }
            return null;
        }

        return Math.abs(point2Time - point1Time);
    }

    getDeltaToLap(lap: number[], distance: number, currentTime?: number) {
        if (lap.length === 0 || this.crossedFinishLine == null) return null;

        // lerp instead:
        const index = Math.floor(distance * Driver.pointsPerMeter);
        if (index >= lap.length) return null;

        let timeInLap;
        if (index === lap.length - 1) {
            timeInLap = lap[index];
            if (timeInLap == null) return null;
        } else {
            const time1 = lap[index];
            const time2 = lap[index + 1];
            if (time1 == null || time2 == null) return null;
            timeInLap = time1 + (time2 - time1) * (distance * Driver.pointsPerMeter - index);
        }

        timeInLap = timeInLap - lap[0];

        if (!valueIsValid(currentTime)) {
            currentTime = this.getCurrentTime();
        }

        return currentTime - timeInLap;
    }

    getCurrentTime(): number {
        if (this.crossedFinishLine == null) return null;

        return Hud.getGameTimestamp() - this.crossedFinishLine;
    }


    /**
     * Get the track distance to a driver ahead.
     */
    getDistanceToDriverAhead(driver: Driver): number {
        const thisLapDistance = this.currentIndex;
        const otherLapDistance = driver.currentIndex;

        if (thisLapDistance == null || otherLapDistance == null) return null;

        if (otherLapDistance < thisLapDistance) {
            return this.trackLength - thisLapDistance + otherLapDistance;
        }
        return otherLapDistance - thisLapDistance;
    }

    /**
     * Get the track distance to a driver behind.
     */
    getDistanceToDriverBehind(driver: Driver): number {
        return driver.getDistanceToDriverAhead(this);
    }

    static average: number = 0;
    static count: number = 0;

    getEstimatedLapTime(): number {
        if (this.bestLapTime == null) {
            if (this.bestLap == null) {
                return null;
            }
            // Get invalid lap time from the best lap
            return this.bestLap[this.bestLap.length - 1] - this.bestLap[0];
        }
        // Return the best lap time
        return this.bestLapTime;
    }
}
