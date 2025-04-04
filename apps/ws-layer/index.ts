import type { ServerWebSocket } from "bun";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { execSync } from "node:child_process";

export type MessagePayload = {
    event: "subscribe";
    data?: null;
} | {
    event: "admin";
    data: {
        type: "command" | "update-file" | "prompt-start" | "prompt-end"
        content: string;
        path?: string;
    };
    callbackId?: string;
}

export type VscodeMessagePayload = {
    event: "vscode_diff";
    diff: string;
    callbackId: string;
}

const SUBSCRIPTIONS: ServerWebSocket<unknown>[] = []
const API_SUBSCRIPTIONS: ServerWebSocket<unknown>[] = []
let bufferedMessages: any[] = []

Bun.serve({
    fetch(req, server) {
        if (server.upgrade(req)) {
            return;
        }
        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        message(ws, message) {
            const payload = JSON.parse(message.toString());
            const { event, data, callbackId } = payload;
            console.log(event, data);

            if (event === "subscribe") {
                SUBSCRIPTIONS.push(ws);
                if (bufferedMessages.length) {
                    SUBSCRIPTIONS.forEach(ws => ws.send(JSON.stringify(bufferedMessages.shift())));
                    bufferedMessages = [];
                }
            } else if (event === "admin") {
                if (data.type === "update-file" && data.path && data.content) {
                    try {
                        const containerPath = data.path;
                        const localPath = containerPath.replace(
                            "/tmp/",
                            "/home/chisty/new-projects/bolt-mobile/"
                        );

                        console.log(`Container path: ${containerPath}`);
                        console.log(`Writing to local path: ${localPath}`);

                        const dirPath = dirname(localPath);
                        if (!existsSync(dirPath)) {
                            mkdirSync(dirPath, { recursive: true });
                        }

                        writeFileSync(localPath, data.content);
                        console.log(`File written successfully: ${localPath}`);
                    } catch (error) {
                        console.error(`Error writing file :`, error);
                    }
                }

                if (data.type === "command" && data.content) {
                    try {
                        const baseDir = "/home/chisty/new-projects/bolt-mobile/nextjs-base-app";
                        console.log(`Executing command in ${baseDir}: ${data.content}`);

                        execSync(data.content, {
                            cwd: baseDir,
                            stdio: 'inherit'
                        });

                        console.log(`Command executed successfully`);
                    } catch (error) {
                        console.error(`Error executing command: ${error}`);
                    }
                }

                if (!SUBSCRIPTIONS.length) {
                    bufferedMessages.push(data);
                } else {
                    SUBSCRIPTIONS.forEach(ws => ws.send(JSON.stringify(data)));
                }

                if (callbackId) {
                    const responsePayload: VscodeMessagePayload = {
                        event: "vscode_diff",
                        diff: "File updated",
                        callbackId: callbackId
                    };
                    ws.send(JSON.stringify(responsePayload));
                }
            } else if (event === "api_subscribe") {
                API_SUBSCRIPTIONS.push(ws);
            } else if (event === "vscode") {
                API_SUBSCRIPTIONS.forEach(ws => ws.send(JSON.stringify(data)));
            }
        },
        open(ws) {
            console.log("WebSocket connection opened");
        },
        close(ws) {
            console.log("WebSocket connection closed");
            const subIndex = SUBSCRIPTIONS.indexOf(ws);
            if (subIndex !== -1) SUBSCRIPTIONS.splice(subIndex, 1);

            const apiIndex = API_SUBSCRIPTIONS.indexOf(ws);
            if (apiIndex !== -1) API_SUBSCRIPTIONS.splice(apiIndex, 1);
        },
    },
    port: 9093
});