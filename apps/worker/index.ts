import cors from "cors";
import express from "express";
import prismaClient from "../../packages/db/index";
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from "./systemPrompt";
import { ArtifactProcessor } from "./parser";
// import { onFileUpdate, onPromptEnd, onShellCommand } from "./os";
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



})

app.listen(9091, () => {
    console.log("Server is running on port 9091");
});