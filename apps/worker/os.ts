import prismaClient from "../../packages/db/index";
import { RelayWebsocket } from "./ws2";


function getBaseWorkerDir(type: "NEXTJS" | "REACT_NATIVE" | "REACT") {
    const baseDir = "/home/chisty/new-projects/bolt-mobile";

    if (type == "NEXTJS")
        return `${baseDir}/nextjs-base-app`;

    return `${baseDir}/expo-base-app`;
}

export async function onFileUpdate(filePath: string, fileContent: string, projectId: string, promptId: string, type: "NEXTJS" | "REACT_NATIVE" | "REACT") {

    await prismaClient.action.create({
        data: {
            projectId,
            promptId,
            content: `updated file ${filePath}`
        },
    });

    RelayWebsocket.getInstance().send(JSON.stringify({
        event: "admin",
        data: {
            type: "update-file",
            content: fileContent,
            path: `${getBaseWorkerDir(type)}/${filePath}`
        }
    }))
}

export async function onShellCommand(shellCommand: string, projectId: string, promptId: string) {

    const commands = shellCommand.split("&&");
    for (const command of commands) {
        console.log(`Running command: ${command}`);

        await prismaClient.action.create({
            data: {
                projectId,
                promptId,
                content: `Ran command: ${command}`,
            },
        });

        RelayWebsocket.getInstance().send(JSON.stringify({
            event: "admin",
            data: {
                type: "command",
                content: command
            }
        }))
    }
}

export function onPromptEnd(promptId: string) {

    RelayWebsocket.getInstance().send(JSON.stringify({
        event: "admin",
        data: {
            type: "prompt-end"
        }
    }))
}
