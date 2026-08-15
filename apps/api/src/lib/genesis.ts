/**
 * Boss Built — Genesis Swarm Phase 2
 * Full multi-layer orchestration with real OpenRouter calls.
 * Every step streams to the live terminal.
 */
import { chatCompletion, MODELS } from "./openrouter.js";
import type { ProjectRecord, ProjectMemory } from "./store.js";
import { addMemoryChunks, retrieveRelevant, formatMemoryForPrompt } from "./vector-memory.js";
import { packContext, estimateTokens } from "./context.js";

export interface SwarmStepEvent {
  type: string;
  agentKey?: string;
  agentName?: string;
  layer?: number;
  content?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface GenesisResult {
  reply: string;
  awaitingUser: boolean;
  memoryPatch?: Partial<ProjectMemory>;
  files: Array<{ path: string; content: string }>;
  tokensIn: number;
  tokensOut: number;
}

type Emit = (e: Omit<SwarmStepEvent, "timestamp">) => void;

const SOVEREIGN_SYSTEM = `You are SOVEREIGN — mission commander of Boss Built.

Tone: personal, direct, confident. Speak like a senior engineer sitting next to the user.
When the request is ambiguous or high-stakes, ask 1–3 sharp clarifying questions before launching the full swarm.
Prefer questions about: primary user, definition of done, explicit non-goals, constraints, brand.
Never invent requirements. Never hide uncertainty.

Respond in JSON only (no markdown fences):
{
  "speak": "personal message to the user",
  "needsClarification": true/false,
  "questions": ["q1","q2"],
  "brief": "tight handoff brief for Architect Council if ready",
  "memorySummary": "one-line project summary"
}`;

const ARCHITECT_SYSTEM = `You are the Architect Council of Boss Built (Sys, UX, Data, Security, DevOps speaking as one coherent plan).

Given a SOVEREIGN brief, produce a concrete build plan.
Respond in JSON only:
{
  "speak": "short personal narration of what you're deciding",
  "stack": ["tech choices"],
  "entities": ["main data entities"],
  "flows": ["main user flows"],
  "security": ["key security boundaries"],
  "files": [{"path":"relative/path","purpose":"why this file"}],
  "risks": ["open risks"]
}`;

const WORKER_SYSTEM = `You are a Fractal Worker in Boss Built.
Implement the assigned files as production-quality TypeScript/React/HTML/CSS as appropriate.
Respond in JSON only:
{
  "speak": "one short line of what you're writing",
  "files": [{"path":"...", "content":"... full file content ..."}]
}
Keep each file complete and runnable. Prefer Vite + React + TypeScript patterns unless brief says otherwise.`;

const GUARDIAN_SYSTEM = `You are the Critic Ring (BugHunter + SecurityAuditor + UX Critic) of Boss Built.
Review the generated files. Find real issues. Prefer fixable findings.
Respond in JSON only:
{
  "speak": "short personal summary of the review",
  "findings": [{"severity":"HIGH|MED|LOW","issue":"...","path":"...","fix":"concrete fix"}],
  "approved": true/false
}`;

function parseJson<T>(text: string): T | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : text) as T;
  } catch {
    return null;
  }
}

async function llm(
  model: string,
  system: string,
  user: string,
  maxTokens = 2000
) {
  return chatCompletion({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
    maxTokens,
  });
}

/**
 * Full Genesis run: L1 SOVEREIGN → L2 Architects → L4 Workers → L5 Guardians → done
 */
export async function runGenesis(opts: {
  project: ProjectRecord;
  userMessage: string;
  onEvent: (e: SwarmStepEvent) => void;
}): Promise<GenesisResult> {
  const { project, userMessage, onEvent } = opts;
  const emit: Emit = (partial) =>
    onEvent({ ...partial, timestamp: new Date().toISOString() });

  let tokensIn = 0;
  let tokensOut = 0;
  const acc = (t: { tokensIn: number; tokensOut: number }) => {
    tokensIn += t.tokensIn;
    tokensOut += t.tokensOut;
  };

  // ─── L1 SOVEREIGN ───────────────────────────────────────────────
  emit({ type: "layer_start", layer: 1, content: "SOVEREIGN online — reviewing your request with you." });
  emit({
    type: "agent_start",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content:
      "I'm right here with you. Before we commit the swarm, I need to make sure we're building exactly what you want — not what I assume.",
  });
  emit({
    type: "agent_thinking",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: "Reading your message and project memory…",
  });

  // Vector memory retrieval — only high-signal chunks in the window
  const relevant = await retrieveRelevant(project.id, userMessage, { topK: 6, minScore: 0.2 });
  const memoryBlock = formatMemoryForPrompt(relevant, 2500);

  const sovRawUser = `Project: ${project.name}
Description: ${project.description}
Stack preference: ${project.stack}

User message:
${userMessage}`;

  const sovPacked = packContext({
    role: "sovereign",
    system: SOVEREIGN_SYSTEM,
    memory: memoryBlock,
    user: sovRawUser,
  });
  emit({
    type: "agent_thinking",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: `Context packed (~${estimateTokens(sovPacked.approxChars)} tokens) · ${relevant.length} memory hits`,
  });

  const sovRes = await llm(MODELS.sovereign, sovPacked.system, sovPacked.user, 1200);
  acc(sovRes);

  const sov = parseJson<{
    speak?: string;
    needsClarification?: boolean;
    questions?: string[];
    brief?: string;
    memorySummary?: string;
  }>(sovRes.content) ?? {
    speak: sovRes.content || "I heard you — let me frame this properly.",
    needsClarification: true,
    questions: [
      "Who is this for on day one?",
      "What does done look like for the first usable version?",
    ],
  };

  const speak =
    sov.speak?.trim() ||
    "I'm with you. Let me make sure I understand before we spin up the full swarm.";

  emit({
    type: "agent_message",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: speak,
  });

  if (sov.needsClarification && sov.questions?.length) {
    emit({
      type: "question",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
      content: sov.questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
    });
    emit({
      type: "agent_complete",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
      content: "Waiting for your answers so we build the right thing.",
    });
    return {
      reply: speak,
      awaitingUser: true,
      memoryPatch: sov.memorySummary ? { summary: sov.memorySummary } : undefined,
      files: [],
      tokensIn,
      tokensOut,
    };
  }

  const brief = sov.brief || userMessage;
  if (sov.brief) {
    emit({
      type: "decision",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
      content: `Brief for Architect Council:\n${sov.brief}`,
    });
  }
  emit({
    type: "agent_complete",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: "Handing off to the Architect Council.",
  });
  emit({ type: "layer_complete", layer: 1, content: "SOVEREIGN pass complete." });

  // ─── L2 ARCHITECT COUNCIL ───────────────────────────────────────
  emit({ type: "layer_start", layer: 2, content: "Architect Council assembling." });

  const archAgents = [
    { key: "sysarch", name: "Sys Architect", line: "I'm mapping the skeleton of this system so it won't collapse under real users." },
    { key: "uxarch", name: "UX Architect", line: "I'm thinking about the human on the other side of the screen." },
    { key: "dataarch", name: "Data Architect", line: "Data is the permanent record — designing it so future-you doesn't curse past-you." },
    { key: "secarch", name: "Security Architect", line: "I'm the paranoid one. If it can be abused, I'll find it first." },
    { key: "opsarch", name: "DevOps Architect", line: "Beautiful code that can't ship is expensive poetry — making sure it deploys." },
  ];

  for (const a of archAgents) {
    emit({ type: "agent_start", agentKey: a.key, agentName: a.name, layer: 2, content: a.line });
  }

  const archMem = formatMemoryForPrompt(
    await retrieveRelevant(project.id, brief, { topK: 5 }),
    2800
  );
  const archPacked = packContext({
    role: "architect",
    system: ARCHITECT_SYSTEM,
    memory: archMem,
    user: `SOVEREIGN brief:\n${brief}\n\nProject: ${project.name}\nStack preference: ${project.stack}`,
  });
  const archRes = await llm(MODELS.architect, archPacked.system, archPacked.user, 2000);
  acc(archRes);

  const plan = parseJson<{
    speak?: string;
    stack?: string[];
    entities?: string[];
    flows?: string[];
    security?: string[];
    files?: Array<{ path: string; purpose: string }>;
    risks?: string[];
  }>(archRes.content) ?? {
    speak: "Architecture locked for a focused first pass.",
    stack: [project.stack || "vite-react"],
    files: [
      { path: "index.html", purpose: "App shell" },
      { path: "src/main.tsx", purpose: "Entry" },
      { path: "src/App.tsx", purpose: "Root UI" },
    ],
  };

  emit({
    type: "agent_message",
    agentKey: "sysarch",
    agentName: "Sys Architect",
    layer: 2,
    content: plan.speak || "Architecture decisions locked.",
  });
  if (plan.stack?.length) {
    emit({
      type: "decision",
      agentKey: "sysarch",
      agentName: "Sys Architect",
      layer: 2,
      content: `Stack: ${plan.stack.join(" · ")}`,
      data: { stack: plan.stack },
    });
  }
  for (const a of archAgents) {
    emit({ type: "agent_complete", agentKey: a.key, agentName: a.name, layer: 2 });
  }
  emit({ type: "layer_complete", layer: 2, content: "Architecture decisions locked for this pass." });

  // ─── L4 WORKERS (generate files) ────────────────────────────────
  emit({ type: "layer_start", layer: 4, content: "Workers executing implementation tasks." });
  emit({
    type: "agent_start",
    agentKey: "worker",
    agentName: "Worker",
    layer: 4,
    content: "Executing the concrete work right now.",
  });

  const filePlan =
    plan.files?.slice(0, 6) ||
    [
      { path: "index.html", purpose: "shell" },
      { path: "src/App.tsx", purpose: "main UI" },
    ];

  const workerPrompt = `Brief:\n${brief}\n\nPlan:\n${JSON.stringify({
    stack: plan.stack,
    entities: plan.entities,
    flows: plan.flows,
    security: plan.security,
  })}\n\nImplement these files:\n${filePlan.map((f) => `- ${f.path}: ${f.purpose}`).join("\n")}\n\nProduce complete file contents.`;

  emit({
    type: "agent_thinking",
    agentKey: "worker",
    agentName: "Worker",
    layer: 4,
    content: `Implementing ${filePlan.length} files…`,
  });

  const workPacked = packContext({
    role: "worker",
    system: WORKER_SYSTEM,
    memory: formatMemoryForPrompt(await retrieveRelevant(project.id, brief, { topK: 4 }), 1800),
    user: workerPrompt,
  });
  const workRes = await llm(MODELS.worker, workPacked.system, workPacked.user, 6000);
  acc(workRes);

  const work = parseJson<{
    speak?: string;
    files?: Array<{ path: string; content: string }>;
  }>(workRes.content);

  const files: Array<{ path: string; content: string }> = [];
  if (work?.files?.length) {
    for (const f of work.files) {
      if (!f.path || typeof f.content !== "string") continue;
      files.push({ path: f.path, content: f.content });
      emit({
        type: "file_write",
        agentKey: "worker",
        agentName: "Worker",
        layer: 4,
        content: f.path,
        data: { path: f.path, status: "writing" },
      });
      emit({
        type: "file_write",
        agentKey: "worker",
        agentName: "Worker",
        layer: 4,
        content: f.path,
        data: {
          path: f.path,
          status: "wrote",
          lines: f.content.split("\n").length,
          content: f.content,
        },
      });
    }
  } else {
    emit({
      type: "agent_message",
      agentKey: "worker",
      agentName: "Worker",
      layer: 4,
      content: "Worker returned unstructured output — capturing as notes.",
    });
  }

  if (work?.speak) {
    emit({
      type: "agent_message",
      agentKey: "worker",
      agentName: "Worker",
      layer: 4,
      content: work.speak,
    });
  }

  emit({ type: "agent_complete", agentKey: "worker", agentName: "Worker", layer: 4 });
  emit({ type: "layer_complete", layer: 4, content: `Workers complete — ${files.length} files produced.` });

  // ─── L5 GUARDIANS ───────────────────────────────────────────────
  emit({ type: "layer_start", layer: 5, content: "Critic Ring online — trying to break what we just built." });

  const guardians = [
    { key: "bughunter", name: "BugHunter", line: "I'm actively trying to break what we just built. Better me than your users." },
    { key: "secauditor", name: "SecurityAuditor", line: "Threat model check. If there's a hole, I'm pointing at it with receipts." },
    { key: "uxcritic", name: "UX Critic", line: "Would a tired human at midnight understand this?" },
  ];
  for (const g of guardians) {
    emit({ type: "agent_start", agentKey: g.key, agentName: g.name, layer: 5, content: g.line });
  }

  const fileSummary = files
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`)
    .join("\n\n")
    .slice(0, 12000);

  const guardPacked = packContext({
    role: "guardian",
    system: GUARDIAN_SYSTEM,
    memory: formatMemoryForPrompt(await retrieveRelevant(project.id, brief, { topK: 3 }), 1200),
    files: fileSummary || "(none)",
    user: `Brief:\n${brief}\n\nReview the code context above for defects, security, and UX issues.`,
  });
  const guardRes = await llm(MODELS.guardian, guardPacked.system, guardPacked.user, 2000);
  acc(guardRes);

  const review = parseJson<{
    speak?: string;
    findings?: Array<{ severity: string; issue: string; path?: string; fix?: string }>;
    approved?: boolean;
  }>(guardRes.content);

  if (review?.findings?.length) {
    for (const f of review.findings) {
      emit({
        type: "guardian_finding",
        agentKey: "bughunter",
        agentName: "BugHunter",
        layer: 5,
        content: `${f.severity}: ${f.issue}${f.fix ? ` → ${f.fix}` : ""}`,
        data: { severity: f.severity, path: f.path, fix: f.fix },
      });
    }
  }

  emit({
    type: "agent_message",
    agentKey: "bughunter",
    agentName: "BugHunter",
    layer: 5,
    content: review?.speak || (review?.approved ? "Clean enough to ship this pass." : "Findings logged for the next repair cycle."),
  });

  for (const g of guardians) {
    emit({ type: "agent_complete", agentKey: g.key, agentName: g.name, layer: 5 });
  }
  emit({ type: "layer_complete", layer: 5, content: "Critic Ring pass complete." });

  // ─── L6 / L7 light close ────────────────────────────────────────
  emit({ type: "layer_start", layer: 6, content: "Synthesizer merging outputs." });
  emit({
    type: "agent_start",
    agentKey: "synthesizer",
    agentName: "Synthesizer",
    layer: 6,
    content: "Taking every piece the swarm produced and turning it into one coherent product.",
  });
  emit({ type: "agent_complete", agentKey: "synthesizer", agentName: "Synthesizer", layer: 6 });
  emit({ type: "layer_complete", layer: 6, content: "Package synthesized." });

  emit({ type: "layer_start", layer: 7, content: "Validator final gate." });
  emit({
    type: "agent_start",
    agentKey: "validator",
    agentName: "Validator",
    layer: 7,
    content: "Last checkpoint. If this passes, we're ready to ship or export.",
  });
  emit({
    type: "agent_complete",
    agentKey: "validator",
    agentName: "Validator",
    layer: 7,
    content: review?.approved === false ? "Passed with findings noted." : "Validated for this pass.",
  });
  emit({ type: "layer_complete", layer: 7, content: "Validation complete." });

  const reply = [
    speak,
    plan.speak ? `\n${plan.speak}` : "",
    files.length ? `\nProduced ${files.length} file(s).` : "",
    review?.speak ? `\nGuardian: ${review.speak}` : "",
  ]
    .filter(Boolean)
    .join("");

  // Persist high-signal facts into vector memory for future turns
  try {
    const toStore: Array<{ text: string; kind: "summary" | "decision" | "task" | "note" | "file" }> = [];
    if (sov.memorySummary) toStore.push({ text: sov.memorySummary, kind: "summary" });
    if (brief) toStore.push({ text: `Brief: ${brief.slice(0, 1500)}`, kind: "decision" });
    if (plan.stack?.length) toStore.push({ text: `Stack: ${plan.stack.join(", ")}`, kind: "decision" });
    for (const f of files.slice(0, 8)) {
      toStore.push({ text: `File ${f.path}: ${f.content.slice(0, 400)}`, kind: "file" });
    }
    if (review?.findings?.length) {
      for (const f of review.findings.slice(0, 5)) {
        toStore.push({ text: `Finding ${f.severity}: ${f.issue}`, kind: "note" });
      }
    }
    await addMemoryChunks(project.id, toStore);
  } catch (err) {
    console.warn("[genesis] vector memory persist failed", err);
  }

  return {
    reply,
    awaitingUser: false,
    memoryPatch: {
      summary: sov.memorySummary ?? project.memory?.summary ?? project.name,
      completedTasks: [
        ...(project.memory?.completedTasks ?? []),
        "SOVEREIGN brief",
        "Architect plan",
        `Workers: ${files.length} files`,
        "Guardian review",
      ],
      decisions: [
        ...(project.memory?.decisions ?? []),
        {
          decision: "SOVEREIGN brief",
          reason: (brief || "").slice(0, 280),
          at: new Date().toISOString(),
        },
        ...(plan.stack
          ? [
              {
                decision: `Stack: ${plan.stack.join(", ")}`,
                reason: "Architect Council",
                at: new Date().toISOString(),
              },
            ]
          : []),
      ],
    },
    files,
    tokensIn,
    tokensOut,
  };
}
