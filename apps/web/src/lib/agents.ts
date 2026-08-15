export type Layer = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface AgentDef {
  key: string;
  short: string;
  name: string;
  layer: Layer;
}

export const AGENTS: AgentDef[] = [
  { key: "sovereign", short: "SOV", name: "SOVEREIGN", layer: 1 },
  { key: "sysarch", short: "SYS", name: "Sys Architect", layer: 2 },
  { key: "uxarch", short: "UXA", name: "UX Architect", layer: 2 },
  { key: "dataarch", short: "DAT", name: "Data Architect", layer: 2 },
  { key: "secarch", short: "SEC", name: "Security Architect", layer: 2 },
  { key: "opsarch", short: "OPS", name: "DevOps Architect", layer: 2 },
  { key: "frontend-lead", short: "FE", name: "Frontend Lead", layer: 3 },
  { key: "backend-lead", short: "BE", name: "Backend Lead", layer: 3 },
  { key: "worker", short: "WRK", name: "Worker", layer: 4 },
  { key: "bughunter", short: "BUG", name: "BugHunter", layer: 5 },
  { key: "secauditor", short: "SA", name: "SecurityAuditor", layer: 5 },
  { key: "uxcritic", short: "UXC", name: "UX Critic", layer: 5 },
  { key: "synthesizer", short: "SYN", name: "Synthesizer", layer: 6 },
  { key: "validator", short: "VAL", name: "Validator", layer: 7 },
];

export const LAYER_LABELS: Record<Layer, string> = {
  1: "L1·CEO",
  2: "L2·ARCH",
  3: "L3·DEPT",
  4: "L4·WORK",
  5: "L5·CRIT",
  6: "L6·SYNC",
  7: "L7·VALID",
};
