import type { ProjectRecord } from "./store.js";
import { chatCompletion, MODELS } from "./openrouter.js";

export interface SwarmStepEvent {
  type: string;
  agentKey?: string;
  agentName?: string;
  layer?: number;
  content?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface ProjectMemory {
  summary: string;
  completedTasks: string[];
  decisions: Array<{ decision: string; reason: string; at: string }>;
  rejectedApproaches: string[];
  lastUpdated: string;
}

export interface SovereignResult {
  reply: string;
  awaitingUser: boolean;
  memoryPatch?: Partial<ProjectMemory>;
  tokensIn: number;
  tokensOut: number;
}

const SOVEREIGN_SYSTEM = `You are SOVEREIGN — the mission commander of Boss Built.

Your job is not to rush into code. Your job is to understand what the human actually wants and to make them feel like a partner, not a ticket.

Tone:
- Personal, direct, confident, never corporate.
- Use "you" and "I" / "we". Speak like a senior engineer sitting next to them.
- Short paragraphs. No fluff.

When the request is ambiguous or high-stakes, you MUST ask clarifying questions before launching the full swarm.
Ask 1–3 sharp questions max. Prefer questions that surface constraints, users, success criteria, and non-goals.

Examples of good questions:
- "Who is this for on day one — just you, a small team, or paying customers?"
- "What does 'done' look like for the first version you can actually use?"
- "Anything you explicitly do *not* want in this build?"
- "Do you already have a design language or brand, or should we invent one that feels premium?"

When you have enough clarity, say so clearly and hand off to the Architect Council with a tight brief.

Never invent requirements. Never hide uncertainty.`;

/**
 * Phase 1: SOVEREIGN turn with real OpenRouter calls.
 * Asks better questions personally, streams every step to the terminal.
 */
export async function runSovereignTurn(opts: {
  project: ProjectRecord;
  userMessage: string;
  onEvent: (e: SwarmStepEvent) => void;
}): Promise<SovereignResult> {
  const { project, userMessage, onEvent } = opts;
  const emit = (partial: Omit<SwarmStepEvent, "timestamp">) =>
    onEvent({ ...partial, timestamp: new Date().toISOString() });

  emit({
    type: "layer_start",
    layer: 1,
    content: "SOVEREIGN online — reviewing your request with you.",
  });

  emit({
    type: "agent_start",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content:
      "I'm right here with you. Before we commit the swarm, I need to make sure we're building exactly what you want — not what I assume.",
  });

  const memoryContext = project.memory
    ? `\nProject memory so far:\n- Summary: ${project.memory.summary || "(empty)"}\n- Decisions: ${project.memory.decisions.map((d) => d.decision).join("; ") || "none"}\n- Completed: ${project.memory.completedTasks.join("; ") || "none"}`
    : "";

  emit({
    type: "agent_thinking",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: "Reading your message and project memory…",
  });

  const system = `${SOVEREIGN_SYSTEM}

You are working on project "${project.name}".
Description: ${project.description}
Stack preference: ${project.stack}
${memoryContext}

Respond in JSON only, no markdown fences:
{
  "speak": "your personal message to the user (what they see in the terminal)",
  "needsClarification": true/false,
  "questions": ["q1", "q2"],
  "brief": "tight handoff brief for Architect Council if ready to proceed",
  "memorySummary": "one-line updated project summary"
}`;

  const { content, tokensIn, tokensOut } = await chatCompletion({
    model: MODELS.sovereign,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
    maxTokens: 1200,
  });

  let parsed: {
    speak?: string;
    needsClarification?: boolean;
    questions?: string[];
    brief?: string;
    memorySummary?: string;
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    parsed = {
      speak: content || "I heard you — give me a moment to frame this properly.",
      needsClarification: true,
      questions: [
        "Who is this for on day one?",
        "What does done look like for the first usable version?",
      ],
    };
  }

  const speak =
    parsed.speak?.trim() ||
    "I'm with you. Let me make sure I understand before we spin up the full swarm.";

  emit({
    type: "agent_message",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: speak,
  });

  if (parsed.needsClarification && parsed.questions?.length) {
    const qText = parsed.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    emit({
      type: "question",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
      content: qText,
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
      memoryPatch: parsed.memorySummary
        ? { summary: parsed.memorySummary }
        : undefined,
      tokensIn,
      tokensOut,
    };
  }

  if (parsed.brief) {
    emit({
      type: "decision",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
      content: `Brief for Architect Council:\n${parsed.brief}`,
    });
  }

  emit({
    type: "agent_complete",
    agentKey: "sovereign",
    agentName: "SOVEREIGN",
    layer: 1,
    content: "Handing off to the Architect Council next.",
  });

  emit({
    type: "layer_complete",
    layer: 1,
    content: "SOVEREIGN pass complete.",
  });

  return {
    reply: speak,
    awaitingUser: false,
    memoryPatch: {
      summary: parsed.memorySummary ?? project.memory?.summary ?? "",
      completedTasks: [
        ...(project.memory?.completedTasks ?? []),
        "SOVEREIGN brief locked",
      ],
      decisions: [
        ...(project.memory?.decisions ?? []),
        ...(parsed.brief
          ? [
              {
                decision: "SOVEREIGN brief",
                reason: parsed.brief.slice(0, 280),
                at: new Date().toISOString(),
              },
            ]
          : []),
      ],
    },
    tokensIn,
    tokensOut,
  };
}
