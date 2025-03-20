import prismaClient from "db/client";

function getBaseWorkerDir(type: "NEXTJS" | "REACT_NATIVE") {
    if (type == "NEXTJS")
        return "/tmp/next-app";

    return "/tmp/mobile-app";
}

export async function onFileUpdate(filePath: string, fileContent: string, projectId: string, promptId: string, type: "NEXTJS" | "REACT_NATIVE") {

    await prismaClient.action.create({
        data: {
            projectId,
            promptId,
            content: `updated file ${filePath}`
        },
    });
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
    }
}

