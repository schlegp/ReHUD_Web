import {HubConnection, HubConnectionState} from "@microsoft/signalr";

export default abstract class PlatformHandler {
    private static ipcRenderer: any = {};
    private static signalConnection: HubConnection;
    public static isElectron = typeof window !== 'undefined' && typeof window.process !== 'undefined' && window.process.versions && window.process.versions.electron;

    public static async sendCommand(command: string, data?: any ) {
        await this.ensurePlatformConnection();
        if (PlatformHandler.isElectron) {
            await this.sendElectronCommand(command, data);
        }else{
            await this.sendSignalrCommand(command, data);
        }
    }

    public static async registerEvent(channel: string, listener: any) {
        if (PlatformHandler.isElectron) {
            await this.registerElectronEvent(channel, listener);
        }else{
            await this.registerSignalrEvent(channel, listener);
        }
    }

    private static async registerElectronEvent(channel: string, listener: Function) {
        await this.ensurePlatformConnection();
        PlatformHandler.ipcRenderer.on(channel, listener);
    }

    private static async registerSignalrEvent(channel: string, listener: any) {
        await this.ensurePlatformConnection();
        PlatformHandler.signalConnection.on(channel, (args) => {
            listener(0, args)
        } );
    }

    private static async sendElectronCommand(command: string, data?: any) {
        await this.ensurePlatformConnection();
        PlatformHandler.ipcRenderer.send(command, data);
    }

    private static async sendSignalrCommand(command: string, data?: any) {
        await this.ensurePlatformConnection();
        await PlatformHandler.signalConnection.send(command, data);
    }

    private static async ensurePlatformConnection() {
        if (PlatformHandler.isElectron && !PlatformHandler.ipcRenderer) {
            PlatformHandler.ipcRenderer = window.electron.ipcRenderer;
        }

        if (!PlatformHandler.isElectron && !PlatformHandler.signalConnection) {
            let signalR = await require('@microsoft/signalr');
            PlatformHandler.signalConnection = new signalR.HubConnectionBuilder()
                .withUrl("/ReHudHub")
                .build();
            await PlatformHandler.signalConnection.start();
        } else if (PlatformHandler.signalConnection.state != HubConnectionState.Connected){
            await this.sleep(100);
            await this.ensurePlatformConnection();
            console.log('Waiting');
        }
    }

    private static async sleep(ms: number): Promise<void> {
        return new Promise(
            (resolve) => setTimeout(resolve, ms));
    }

}