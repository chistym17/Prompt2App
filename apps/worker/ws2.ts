export type VscodeMessagePayload = {
    event: "vscode_diff";
    diff: string;
    callbackId: string;
}

export class RelayWebsocket {
    private static instance: RelayWebsocket;
    private ws: WebSocket;
    private callbacks: Map<string, (data: VscodeMessagePayload) => void>;
    isConnected: boolean = false;


    private constructor(url: string) {
        this.ws = new WebSocket(url);
        this.callbacks = new Map();
        this.ws.onmessage = async (event) => {
            console.log("event data", await event.data.text())
            const { callbackId, ...data } = JSON.parse(await event.data.text());
            const callback = this.callbacks.get(callbackId);
            if (callback) {
                callback(data);
            }
        };

        this.ws.onopen = () => {
            this.isConnected = true;
            this.send(JSON.stringify({
                event: "api_subscribe",
            }));
        }
    }

    static getInstance() {
        if (!RelayWebsocket.instance) {
            RelayWebsocket.instance = new RelayWebsocket(process.env.WS_RELAYER_URL || "ws://localhost:9093");
        }
        return RelayWebsocket.instance;
    }

    send(message: string) {
        this.ws.send(message);
    }

    sendAndAwaitResponse(message: any, callbackId: string): Promise<VscodeMessagePayload> {
        this.ws.send(JSON.stringify({ ...message, callbackId }));

        return new Promise((resolve, reject) => {
            this.callbacks.set(callbackId, resolve);
        });
    }

}