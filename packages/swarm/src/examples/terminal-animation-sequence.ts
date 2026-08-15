/**
 * Reference event sequences for terminal animations.
 * Use these in Storybook / mock SSE so UI motion can be developed
 * before the real LLM orchestrator is fully online.
 */
import type { SwarmStepEvent } from "@nexus/shared";

const t = (offsetMs: number) =>
  new Date(Date.UTC(2026, 0, 1, 0, 0, 0, offsetMs)).toISOString();

/** Clarifying-question path — SOVEREIGN stops and waits for the user */
export const CLARIFY_SEQUENCE: SwarmStepEvent[] = [
  {
    type: "layer_start",
    layer: 1,
    content: "SOVEREIGN online — reviewing your request with you.",
    timestamp: t(0),
  },
  {
    type: "agent_start",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content:
      "I'm right here with you. Before we commit the swarm, I need to make sure we're building exactly what you want — not what I assume.",
    timestamp: t(200),
  },
  {
    type: "question",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content:
      "1. Who is the primary user of this on day one?\n2. What does a successful first version look like for *you*?\n3. Anything you explicitly do not want included?",
    timestamp: t(3500),
  },
  {
    type: "agent_complete",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: "Waiting for your answers so we build the right thing.",
    timestamp: t(4200),
  },
];

/** Happy-path cascade through Architect Council with file writes */
export const ARCHITECT_PASS_SEQUENCE: SwarmStepEvent[] = [
  {
    type: "layer_start",
    layer: 1,
    content: "SOVEREIGN online.",
    timestamp: t(0),
  },
  {
    type: "agent_start",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: "Clear enough. I'm briefing the Architect Council and keeping you in the loop the entire way.",
    timestamp: t(150),
  },
  {
    type: "agent_complete",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    timestamp: t(900),
  },
  {
    type: "layer_complete",
    layer: 1,
    content: "Mission brief locked.",
    timestamp: t(950),
  },
  {
    type: "layer_start",
    layer: 2,
    content: "Architect Council assembling.",
    timestamp: t(1100),
  },
  {
    type: "agent_start",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    content: "I'm mapping the skeleton of this system so it won't collapse the first time real users hit it.",
    timestamp: t(1300),
  },
  {
    type: "agent_thinking",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    content: "Choosing Vite + React for the studio shell, Express for the control plane, Postgres + Drizzle for memory.",
    timestamp: t(2200),
  },
  {
    type: "decision",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    content: "Stack locked: Vite/React · Express · Drizzle/Postgres · Stripe · Vercel.",
    data: { stack: ["vite-react", "express", "drizzle", "stripe", "vercel"] },
    timestamp: t(3100),
  },
  {
    type: "file_write",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    content: "packages/db/src/schema/projects.ts",
    data: { path: "packages/db/src/schema/projects.ts", lines: 42, status: "writing" },
    timestamp: t(3400),
  },
  {
    type: "file_write",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    content: "packages/db/src/schema/projects.ts",
    data: { path: "packages/db/src/schema/projects.ts", lines: 42, status: "wrote", durationMs: 1100 },
    timestamp: t(4500),
  },
  {
    type: "agent_complete",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    timestamp: t(4700),
  },
  {
    type: "agent_start",
    agentKey: "secarch",
    agentName: "Security Architect",
    layer: 2,
    content: "I'm the paranoid one. If it can be abused, I'll find it before anyone else does.",
    timestamp: t(4900),
  },
  {
    type: "agent_message",
    agentKey: "secarch",
    agentName: "Security Architect",
    layer: 2,
    content: "Auth boundary: JWT httpOnly cookies, role checks on every project route, no cross-tenant memory reads.",
    timestamp: t(5600),
  },
  {
    type: "agent_complete",
    agentKey: "secarch",
    agentName: "Security Architect",
    layer: 2,
    timestamp: t(6200),
  },
  {
    type: "layer_complete",
    layer: 2,
    content: "Architecture decisions locked for this pass.",
    timestamp: t(6400),
  },
];

/** Guardian finding + auto-repair beat */
export const GUARDIAN_REPAIR_SEQUENCE: SwarmStepEvent[] = [
  {
    type: "layer_start",
    layer: 5,
    content: "Critic Ring online — trying to break what we just built.",
    timestamp: t(0),
  },
  {
    type: "agent_start",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    content: "I'm actively trying to break what we just built. Better me than your users.",
    timestamp: t(200),
  },
  {
    type: "guardian_finding",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    content: "Missing rate limit on POST /api/auth/login — credential stuffing surface.",
    data: { severity: "HIGH", path: "apps/api/src/routes/auth.ts" },
    timestamp: t(1800),
  },
  {
    type: "agent_message",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    content: "Patching with a sliding-window limiter (10 attempts / 15 min / IP).",
    timestamp: t(2400),
  },
  {
    type: "file_edit",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    content: "apps/api/src/routes/auth.ts",
    data: { path: "apps/api/src/routes/auth.ts", status: "wrote", linesChanged: 18 },
    timestamp: t(3200),
  },
  {
    type: "guardian_finding",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    content: "Rate limit in place. Re-checked — clean.",
    data: { severity: "FIXED", path: "apps/api/src/routes/auth.ts" },
    timestamp: t(3600),
  },
  {
    type: "agent_complete",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    timestamp: t(3800),
  },
  {
    type: "layer_complete",
    layer: 5,
    content: "Critic Ring pass complete.",
    timestamp: t(4000),
  },
];

/** Helper: play a sequence through the event bus with realistic delays */
export async function playSequence(
  sequence: SwarmStepEvent[],
  emit: (e: SwarmStepEvent) => void | Promise<void>,
  speed = 1
) {
  let last = 0;
  for (const event of sequence) {
    const at = new Date(event.timestamp).getTime();
    const base = new Date(sequence[0]!.timestamp).getTime();
    const wait = Math.max(0, (at - base - last) / speed);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = at - base;
    await emit(event);
  }
}
