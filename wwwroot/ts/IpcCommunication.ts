import PlatformHandler from './platform/PlatformHandler';
import {promiseTimeout, TimeoutError} from './consts';

export default class IpcCommunication {
    /**
     * Listen to a channel from the main process, and send a response back to the main process.
     * @param channel - The channel to listen to
     * @param callback - The callback to call when the channel is received. The value returned from the callback will be sent back to the main process (awaited if it is a promise).
     */
    static handle(channel: string, callback: (event: any, args: any) => Promise<any>) {
        PlatformHandler.registerEvent(channel, (event: any, args: string) => {
            (async () => {
                // const data = JSON.parse(args);
                // console.log(data);
                let res: any = null;
                try {
                    res = await promiseTimeout(callback(event, args), 10000);
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

                // await commsHandler.sendCommand(conversationId, JSON.stringify(response));
            })();
        });
    }
}
