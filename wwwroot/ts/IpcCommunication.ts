import PlatformHandler from './platform/PlatformHandler';
import {promiseTimeout, TimeoutError} from './consts';

const commsHandler = new PlatformHandler();

export default class IpcCommunication {
    /**
     * Listen to a channel from the main process, and send a response back to the main process.
     * @param channel - The channel to listen to
     * @param callback - The callback to call when the channel is received. The value returned from the callback will be sent back to the main process (awaited if it is a promise).
     */
    static handle(channel: string, callback: (event: any, args: any) => Promise<any>) {
        commsHandler.registerEvent(channel, (event: any, args: string) => {
            (async () => {
                console.log("registerEvent: ", args);
                const data = JSON.parse(args[0]);
                const conversationId: string = data[0];
                let res: any = null;
                try {
                    res = await promiseTimeout(callback(event, data[1]), 10000);
                } catch (e) {
                    if (e instanceof TimeoutError) {
                        console.error(`Response to ${channel} timed out.`, e);
                    } else {
                        console.error(e);
                    }
                }

                const response = [Date.now()];
                if (res !== undefined) {
                    response.push(res);
                }

                commsHandler.sendCommand(conversationId, JSON.stringify(response));
            })();
        });
    }
}
