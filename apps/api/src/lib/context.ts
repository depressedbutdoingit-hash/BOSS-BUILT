/**
 * Optimized LLM context windows for Boss Built.
 * Budget tokens by role; pack only high-signal memory + brief + files.
 */

export interface ContextBudget {
  /** Approximate char budget (roughly 4 chars ≈ 1 token) */
  maxChars: number;
  systemMax: number;
  memoryMax: number;
  filesMax: number;
  userMax: number;
}

/** Role-tuned budgets — keep prompts lean and high-signal */
export const BUDGETS: Record<string, ContextBudget> = {
  sovereign: {
    maxChars: 12_000,
    systemMax: 3_500,
    memoryMax: 2_500,
    filesMax: 0,
    userMax: 4_000,
  },
  architect: {
    maxChars: 14_000,
    systemMax: 2_500,
    memoryMax: 3_000,
    filesMax: 0,
    userMax: 6_000,
  },
  worker: {
    maxChars: 28_000,
    systemMax: 2_000,
    memoryMax: 2_000,
    filesMax: 8_000,
    userMax: 12_000,
  },
  guardian: {
    maxChars: 24_000,
    systemMax: 2_000,
    memoryMax: 1_500,
    filesMax: 14_000,
    userMax: 4_000,
  },
};

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 20) + "\n…[truncated]";
}

export function packContext(opts: {
  role: keyof typeof BUDGETS;
  system: string;
  memory: string;
  files?: string;
  user: string;
}): { system: string; user: string; approxChars: number } {
  const b = BUDGETS[opts.role] ?? BUDGETS.sovereign!;
  const system = clip(opts.system, b.systemMax);
  const memory = clip(opts.memory || "(none)", b.memoryMax);
  const files = opts.files ? clip(opts.files, b.filesMax) : "";
  const userCore = clip(opts.user, b.userMax);

  const userParts = [
    memory && memory !== "(none)" ? `Relevant memory:\n${memory}` : "",
    files ? `Code context:\n${files}` : "",
    userCore,
  ].filter(Boolean);

  let user = userParts.join("\n\n");
  const overhead = system.length + user.length;
  if (overhead > b.maxChars) {
    user = clip(user, Math.max(500, b.maxChars - system.length));
  }

  return {
    system,
    user,
    approxChars: system.length + user.length,
  };
}

/** Rough token estimate for logging / metering */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}
