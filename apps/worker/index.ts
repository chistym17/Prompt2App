import cors from "cors";
import express from "express";
import prismaClient from "../../packages/db/index";
import { OpenAI } from "openai";
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
import { onFileUpdate, onShellCommand, onPromptEnd } from "./os";
import { RelayWebsocket } from "./ws2";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const client2 = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

app.post("/prompt", async (req, res) => {
    const { prompt, projectId } = req.body;
    console.log(prompt, projectId);

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

    const relay = RelayWebsocket.getInstance();
    if (relay.isConnected) {
        const { diff } = await relay.sendAndAwaitResponse({
            event: "admin",
            data: {
                type: "prompt-start",
            }
        }, promptdb.id);
    }

    const allPrompts = await prismaClient.prompt.findMany({
        where: {
            projectId,
        },
        orderBy: {
            createdAt: "asc",
        },
    });


    let artifactProcessor = new ArtifactProcessor(
        "",
        (filePath, fileContent) => onFileUpdate(filePath, fileContent, projectId, promptdb.id, project.type),
        (shellCommand) => onShellCommand(shellCommand, projectId, promptdb.id)
    );

    let artifact = "";

    const systemMessage = systemPrompt(project.type);

    const formattedMessages = [];

    formattedMessages.push({
        role: "user",
        parts: [{ text: `System: ${systemMessage}` }]
    });

    for (const p of allPrompts) {
        formattedMessages.push({
            role: p.type === "USER" ? "user" : "assistant",
            parts: [{ text: p.content }]
        });
    }

    formattedMessages.push({
        role: "user",
        parts: [{ text: prompt }]
    });

    try {
        const result = await client2.models.generateContentStream({
            model: "gemini-2.0-flash",
            contents: formattedMessages,

        });

        for await (const chunk of result) {
            if (chunk.text) {
                const textChunk = chunk.text;
                artifactProcessor.append(textChunk);
                artifactProcessor.parse();
                artifact += textChunk;
                res.write(textChunk);
            }
        }




        await prismaClient.prompt.create({
            data: {
                content: artifact,
                projectId,
                type: "SYSTEM",
            },
        });



        await prismaClient.action.create({
            data: {
                content: "Done!",
                projectId,
                promptId: promptdb.id,
            },
        });

        onPromptEnd(promptdb.id);


    } catch (error: any) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
});

app.listen(9091, () => {
    console.log("Server is running on port 9091");
});