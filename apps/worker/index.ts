import cors from "cors";
import express from "express";
import prismaClient from "../../packages/db/index";
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import { onFileUpdate, onPromptEnd, onShellCommand } from "./os";
// import { RelayWebsocket } from "./ws";

const app = express();
app.use(cors());

app.use(express.json());

app.post("/prompt", async (req, res) => {

    const { prompt, projectId } = req.body();
    const client = new Anthropic();
    const project = await prismaClient.project.findUnique({
        where: {
            id: projectId,
        },
    });

    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const promptdb = await prismaClient.prompt.create({
        data: {
            content: prompt,
            projectId,
            type: "USER",
        },
    });





    const allPrompts = await prismaClient.prompt.findMany({
        where: {
            projectId,
        },
        orderBy: {
            createdAt: "asc",
        },
    });


    let artifactProcessor = new ArtifactProcessor("", (filePath, fileContent) => onFileUpdate(filePath, fileContent, projectId, promptDb.id, project.type), (shellCommand) => onShellCommand(shellCommand, projectId, promptDb.id));

    let artifact = "";

    let response = client.messages.stream({
        messages: allPrompts.map((p: any) => ({
            role: p.type == "USER" ? "user" : "assistant",
            content: p.content,
        })),
        system: systemPrompt(project.type),
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 8000,

    }).on('text', (text) => {
        artifactProcessor.append(text);
        artifactProcessor.parse();
        artifact += text;

    })
        .on('finalMessage', async (message) => {
            console.log("done!");
            await prismaClient.prompt.create({
                data: {
                    content: artifact,
                    projectId,
                    type: "SYSTEM",
                },
            });



        });

});

app.listen(9091, () => {
    console.log("Server is running on port 9091");
});
