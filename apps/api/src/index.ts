import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { exportRouter } from "./routes/export.js";
import { billingRouter } from "./routes/billing.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(
  cors({
    origin: process.env.BOSS_APP_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_req, res) => {
  let database: "postgres" | "memory" = "memory";
  try {
    const { store } = await import("./lib/store.js");
    if (await store.usingPostgres()) database = "postgres";
  } catch { /* keep memory */ }
  res.json({
    ok: true,
    service: "boss-built-api",
    phase: 5,
    database,
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    time: new Date().toISOString(),
  });
});

app.use("/auth", authRouter);
app.use("/projects", projectsRouter);
app.use("/projects", exportRouter);
app.use("/billing", billingRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api]", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n  Boss Built API  →  http://localhost:${PORT}`);
  console.log(`  Health           →  http://localhost:${PORT}/health`);
  console.log(`  OpenRouter key   →  ${process.env.OPENROUTER_API_KEY ? "loaded" : "MISSING"}\n`);
});
