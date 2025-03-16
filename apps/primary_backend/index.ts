import prismaClient from "../../packages/db/index";
import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware";

const app = express();

app.use(express.json());
app.use(cors());

app.post("/project", authMiddleware, async (req: any, res) => {
  const { prompt } = req.body;
  const userId = (req as any).userId;
  const description = prompt.split("\n")[0];
  const project = await prismaClient.project.create({
    data: { description, userId },
  });
  res.json({ projectId: project.id });
});

app.get("/projects", authMiddleware, async (req: any, res) => {
  const userId = (req as any).userId;
  const projects = await prismaClient.project.findMany({
    where: { userId },
  });
  res.json({ projects });
});

app.get("/prompts/:projectId", authMiddleware, async (req, res) => {
  const projectId = req.params.projectId;

  const prompts = await prismaClient.prompt.findMany({
    where: { projectId },
  });
  res.json({ prompts });
});

app.listen(9090, () => {
  console.log("Server is running on port 9090");
});