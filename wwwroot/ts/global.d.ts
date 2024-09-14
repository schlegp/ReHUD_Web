declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                on: (channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: any[]) => void) => void;
                send: (channel: string, ...args: any[]) => void;
            }
        }
    }
}
export { };