import {HubConnection, HubConnectionState} from "@microsoft/signalr";
import * as signalR from "@microsoft/signalr";

export default class PlatformHandler {
    private static instance: PlatformHandler;
    private didLoad = false;
    private invokeQueue: Array<() => void> = [];

    private signalConnection: HubConnection;
    public static isElectron = typeof window !== 'undefined' && typeof window.process !== 'undefined' && window.process.versions && window.process.versions.electron;

    public static async getInstance(from? : string): Promise<PlatformHandler> {
        if (!PlatformHandler.instance) {
            console.log("Getting Instance from: " + from);
            this.instance = new PlatformHandler();
            await this.instance.ensurePlatformConnection();
        }
        return PlatformHandler.instance;
    }

    public async Connect(){
        await this.ensurePlatformConnection();
    }

    public async sendCommand(command: string, data?: any) {
        await this.ensurePlatformConnection();
        await this.sendSignalrCommand(command, data);
    }

    public async registerEvent(channel: string, listener: any, isForData: boolean = false) {
        await this.registerSignalrEvent(channel, listener, isForData);
    }

    public invoke(event: string, ...args: any[]) {
        if (this.didLoad) {
            return this.signalConnection.invoke(event, ...args);
        }

        return new Promise<any>((resolve, reject) => {
            this.invokeQueue.push(() => {
                if (this.signalConnection.state != signalR.HubConnectionState.Connected) {
                    const reason = `Hub connection is in '${this.signalConnection.state}' state, cannot invoke '${event}'`;
                    console.log(reason);
                    reject(new Error(reason));
                    return;
                }
                this.signalConnection
                    .invoke(event, ...args)
                    .then((value) => resolve(value))
                    .catch((err) => reject(err));
            });
        });
    }

    private async registerSignalrEvent(channel: string, listener: any, isForData: boolean = false) {
        await this.ensurePlatformConnection();
        this.signalConnection.on(channel, (args) => {
            listener(0, args)
        });
    }

    private async sendSignalrCommand(command: string, data?: any) {
        await this.ensurePlatformConnection();
        await this.signalConnection.invoke(command, data);
    }

    private async ensurePlatformConnection() {
        if (!this.signalConnection) {
            let currentDomain = window.location.origin;
            let signalR = await require('@microsoft/signalr');
            this.signalConnection = new signalR.HubConnectionBuilder()
                .withUrl(currentDomain + "/ReHudHub")
                .build();
            console.log("Connecting")
            await this.signalConnection.start().then(_ => {
                for (const invoke of this.invokeQueue) {
                    invoke();
                }
                this.didLoad = true;
            });
        } else if (this.signalConnection.state != HubConnectionState.Connected) {
            await this.sleep(100);
            await this.ensurePlatformConnection();
            console.log('Waiting');
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(
            (resolve) => setTimeout(resolve, ms));
    }

}