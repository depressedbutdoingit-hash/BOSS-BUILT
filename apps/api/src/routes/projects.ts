import { Router } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";
import { initSSE } from "../lib/sse.js";
import { runGenesis } from "../lib/genesis.js";
import { getProjectChunkCount } from "../lib/vector-memory.js";
import { retrieveRelevant } from "../lib/vector-memory.js";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
  stack: z.enum(["nextjs", "vite-react", "remix", "astro", "custom"]).optional(),
});

projectsRouter.get("/", async (req, res) => {
  const list = await store.listProjects(req.user!.id);
  res.json({ projects: list });
});

projectsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const project = await store.createProject({
    userId: req.user!.id,
    ...parsed.data,
  });
  res.status(201).json({ project });
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await store.getProject(req.params.id!, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ project });
});

/**
 * Live terminal stream — full Genesis Swarm via SSE.
 * POST body: { message: string }
 */
projectsRouter.post("/:id/chat", async (req, res) => {
  const project = await store.getProject(req.params.id!, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const message =
    typeof req.body?.message === "string"
      ? req.body.message
      : typeof req.query.message === "string"
        ? req.query.message
        : "";

  if (!message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const { send, close } = initSSE(res);

  try {
    await store.updateProject(project.id, { status: "building" });

    const result = await runGenesis({
      project,
      userMessage: message.trim(),
      onEvent: (event) => send(event),
    });

    const patch: Record<string, unknown> = {
      status: result.awaitingUser ? "planning" : "reviewing",
    };

    if (result.memoryPatch && project.memory) {
      patch.memory = {
        ...project.memory,
        ...result.memoryPatch,
        lastUpdated: new Date().toISOString(),
      };
    }

    if (result.files.length) {
      // Store as a simple snapshot for Phase 2
      patch.generatedCode = JSON.stringify(result.files);
    }

    await store.updateProject(project.id, patch as Parameters<typeof store.updateProject>[1]);

    send({
      type: "done",
      content: result.reply,
      data: {
        awaitingUser: result.awaitingUser,
        files: result.files.map((f) => f.path),
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      },
    });
  } catch (err) {
    send({
      type: "error",
      content: err instanceof Error ? err.message : "Swarm error",
    });
  } finally {
    close();
  }
});


/** Vector memory inspector for the project */
projectsRouter.get("/:id/memory", async (req, res) => {
  const project = await store.getProject(req.params.id!, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const q = typeof req.query.q === "string" ? req.query.q : project.description || project.name;
  try {
    const chunks = await retrieveRelevant(project.id, q, { topK: 12, minScore: 0.1 });
    res.json({
      count: getProjectChunkCount(project.id),
      query: q,
      chunks: chunks.map((c) => ({
        id: c.id,
        kind: c.kind,
        text: c.text,
        score: c.score,
        createdAt: c.createdAt,
      })),
      projectMemory: project.memory,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Memory fetch failed",
      count: getProjectChunkCount(project.id),
      projectMemory: project.memory,
      chunks: [],
    });
  }
});
