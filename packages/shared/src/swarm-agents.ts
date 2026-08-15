/**
 * HYDRA-PRIME 7-Layer Swarm — the visual + runtime identity of Boss Built.
 * Kept faithful to the original visual language while being cleaner for v2.
 */

export type SwarmLayer = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SwarmAgentDef {
  key: string;
  name: string;
  short: string;
  color: "primary" | "accent" | "red" | "cyan" | "green" | "yellow";
  layer: SwarmLayer;
  role: string;
  /** Personal voice used when the agent speaks in the terminal */
  voice: string;
}

export const SWARM_AGENTS: SwarmAgentDef[] = [
  // Layer 1 — SOVEREIGN
  {
    key: "sovereign",
    name: "SOVEREIGN",
    short: "SOV",
    color: "accent",
    layer: 1,
    role: "Mission commander. Clarifies intent, asks the sharp questions, owns the final call.",
    voice:
      "I'm right here with you. Before we commit the swarm, I need to make sure we're building exactly what you want — not what I assume.",
  },

  // Layer 2 — Architect Council
  {
    key: "sysarch",
    name: "Sys Architect",
    short: "SYS",
    color: "primary",
    layer: 2,
    role: "System architecture, boundaries, scalability.",
    voice: "I'm mapping the skeleton of this system so it won't collapse the first time real users hit it.",
  },
  {
    key: "uxarch",
    name: "UX Architect",
    short: "UXA",
    color: "accent",
    layer: 2,
    role: "Experience, flows, accessibility, delight.",
    voice: "I'm thinking about the human on the other side of the screen — every click has to feel inevitable.",
  },
  {
    key: "dataarch",
    name: "Data Architect",
    short: "DAT",
    color: "cyan",
    layer: 2,
    role: "Schema, relationships, query patterns, consistency.",
    voice: "Data is the permanent record. I'm designing it so future-you doesn't curse past-you.",
  },
  {
    key: "secarch",
    name: "Security Architect",
    short: "SEC",
    color: "red",
    layer: 2,
    role: "Auth, secrets, threat model, OWASP.",
    voice: "I'm the paranoid one. If it can be abused, I'll find it before anyone else does.",
  },
  {
    key: "opsarch",
    name: "DevOps Architect",
    short: "OPS",
    color: "primary",
    layer: 2,
    role: "Deploy, CI, observability, environments.",
    voice: "Beautiful code that can't ship is just expensive poetry. I'm making sure it deploys clean.",
  },

  // Layer 3 — Department Heads (examples — expandable)
  {
    key: "frontend-lead",
    name: "Frontend Lead",
    short: "FE",
    color: "cyan",
    layer: 3,
    role: "UI implementation ownership.",
    voice: "I'm breaking the experience into components that are actually maintainable.",
  },
  {
    key: "backend-lead",
    name: "Backend Lead",
    short: "BE",
    color: "primary",
    layer: 3,
    role: "API + business logic ownership.",
    voice: "Endpoints, auth boundaries, and the contracts that keep the frontend honest.",
  },
  {
    key: "data-lead",
    name: "Data Lead",
    short: "DL",
    color: "green",
    layer: 3,
    role: "Migrations, queries, integrity.",
    voice: "I'm writing the schema and the queries that won't wake you up at 3am.",
  },

  // Layer 4 — Fractal Workers (generic placeholders — runtime creates specialized ones)
  {
    key: "worker",
    name: "Worker",
    short: "WRK",
    color: "yellow",
    layer: 4,
    role: "Atomic implementation task.",
    voice: "Executing the concrete work right now.",
  },

  // Layer 5 — Critic Ring (Guardians)
  {
    key: "bughunter",
    name: "BugHunter",
    short: "BUG",
    color: "red",
    layer: 5,
    role: "Finds defects, edge cases, regressions.",
    voice: "I'm actively trying to break what we just built. Better me than your users.",
  },
  {
    key: "secauditor",
    name: "SecurityAuditor",
    short: "SA",
    color: "red",
    layer: 5,
    role: "Security review + exploit paths.",
    voice: "Threat model check. If there's a hole, I'm pointing at it with receipts.",
  },
  {
    key: "uxcritic",
    name: "UX Critic",
    short: "UXC",
    color: "accent",
    layer: 5,
    role: "Usability, clarity, accessibility critique.",
    voice: "Would a tired human at midnight understand this? I'm making sure the answer is yes.",
  },

  // Layer 6 — Synthesizer
  {
    key: "synthesizer",
    name: "Synthesizer",
    short: "SYN",
    color: "green",
    layer: 6,
    role: "Merges outputs, resolves conflicts, produces coherent package.",
    voice: "Taking every piece the swarm produced and turning it into one coherent product.",
  },

  // Layer 7 — Validator
  {
    key: "validator",
    name: "Validator",
    short: "VAL",
    color: "primary",
    layer: 7,
    role: "Final quality gate before deploy/export.",
    voice: "Last checkpoint. If this passes, we're ready to ship or export.",
  },
];

export const LAYER_LABELS: Record<SwarmLayer, string> = {
  1: "L1·CEO",
  2: "L2·ARCH",
  3: "L3·DEPT",
  4: "L4·WORK",
  5: "L5·CRIT",
  6: "L6·SYNC",
  7: "L7·VALID",
};

export function getAgent(key: string): SwarmAgentDef | undefined {
  return SWARM_AGENTS.find((a) => a.key === key);
}
