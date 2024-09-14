export default class PlatformHandler {

    private ipcRenderer: any = {};
    public isElectron = typeof window !== 'undefined' && typeof window.process !== 'undefined' && window.process.versions && window.process.versions.electron;

    public async sendCommand(command: string, data?: any ) {
        console.log("Sendcommand: ", this.isElectron);
        if (this.isElectron) {
            console.log("Test")
            await this.sendElectronCommand(command, data);
        }
    }

    public async registerEvent(channel: string, listener: Function) {
        if (this.isElectron) {
            await this.registerElectronEvent(channel, listener);
        }
    }

    private async registerElectronEvent(channel: string, listener: Function) {
        await this.ensureElectron();
        this.ipcRenderer.on(channel, listener);
    }

    private async sendElectronCommand(command: string, data?: any) {
        await this.ensureElectron();
        this.ipcRenderer.send(command, data);
    }

    private async ensureElectron() {
        if (!this.ipcRenderer) {
            this.ipcRenderer = window.electron.ipcRenderer;
        }
    }
}