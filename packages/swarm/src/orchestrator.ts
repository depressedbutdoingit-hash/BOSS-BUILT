import { SWARM_AGENTS, getAgent, type SwarmAgentDef } from "@nexus/shared";
import type { ProjectMemory, SwarmStepEvent } from "@nexus/shared";
import { SwarmEventBus } from "./events";
import { SOVEREIGN_SYSTEM, personalAgentPreamble } from "./prompts";

export interface SwarmRunInput {
  projectId: string;
  userMessage: string;
  memory?: ProjectMemory | null;
  /** When true, Sovereign must clarify before full build */
  requireClarification?: boolean;
}

export interface SwarmRunResult {
  reply: string;
  memoryPatch?: Partial<ProjectMemory>;
  filesTouched: string[];
  events: SwarmStepEvent[];
}

/**
 * Genesis Swarm Orchestrator (v2 skeleton).
 *
 * Design goals for the live terminal:
 * 1. Personal voice — agents speak as collaborators, not logs.
 * 2. Full transparency — every meaningful step is emitted as an event.
 * 3. Better questions — Sovereign asks sharp clarifying questions before burning tokens.
 * 4. Same visual identity — 7-layer Hydra-Prime agents drive the UI grid.
 */
export class GenesisOrchestrator {
  readonly bus = new SwarmEventBus();
  private events: SwarmStepEvent[] = [];

  private async emit(
    partial: Omit<SwarmStepEvent, "timestamp"> & { timestamp?: string }
  ) {
    const event: SwarmStepEvent = {
      ...partial,
      timestamp: partial.timestamp ?? new Date().toISOString(),
    };
    this.events.push(event);
    await this.bus.emit(event);
  }

  async run(input: SwarmRunInput): Promise<SwarmRunResult> {
    this.events = [];

    // ── Layer 1: SOVEREIGN ──────────────────────────────────────────
    await this.emit({
      type: "layer_start",
      layer: 1,
      content: "SOVEREIGN online — reviewing your request with you.",
    });

    const sovereign = getAgent("sovereign")!;
    await this.emit({
      type: "agent_start",
      agentKey: sovereign.key,
      agentName: sovereign.name,
      layer: 1,
      content: sovereign.voice,
    });

    // Placeholder: real LLM call will go here.
    // For Phase 0 we emit the shape of the conversation so the terminal can be built against it.
    const needsQuestions =
      input.requireClarification ?? this.looksAmbiguous(input.userMessage);

    if (needsQuestions) {
      await this.emit({
        type: "question",
        agentKey: "sovereign",
        agentName: "SOVEREIGN",
        layer: 1,
        content:
          "Before I commit the full swarm, I want to make sure we're aligned.\n\n" +
          "1. Who is the primary user of this on day one?\n" +
          "2. What does a successful first version look like for *you*?\n" +
          "3. Anything you explicitly do not want included?",
      });

      await this.emit({
        type: "agent_complete",
        agentKey: "sovereign",
        agentName: "SOVEREIGN",
        layer: 1,
        content: "Waiting for your answers so we build the right thing.",
      });

      return {
        reply:
          "I've got a few sharp questions before we spin up the full swarm. Answer them and I'll take it from there.",
        filesTouched: [],
        events: this.events,
      };
    }

    await this.emit({
      type: "agent_message",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
      content:
        "Clear enough. I'm briefing the Architect Council and keeping you in the loop the entire way.",
    });

    await this.emit({
      type: "agent_complete",
      agentKey: "sovereign",
      agentName: "SOVEREIGN",
      layer: 1,
    });

    // ── Layer 2: Architect Council (skeleton narration) ─────────────
    await this.emit({
      type: "layer_start",
      layer: 2,
      content: "Architect Council assembling.",
    });

    const architects = SWARM_AGENTS.filter((a) => a.layer === 2);
    for (const agent of architects) {
      await this.narrateAgent(agent, `Reviewing ${agent.role.toLowerCase()}.`);
    }

    await this.emit({
      type: "layer_complete",
      layer: 2,
      content: "Architecture decisions locked for this pass.",
    });

    // Later layers (3–7) will be implemented in Phase 2 with real LLM + tools.
    await this.emit({
      type: "done",
      content:
        "Phase 0 scaffold complete. Full multi-layer execution lands in Phase 2.",
    });

    return {
      reply:
        "Architect Council has the brief. Full build pipeline comes online in the next phase — the terminal already shows every step as it happens.",
      filesTouched: [],
      events: this.events,
    };
  }

  private async narrateAgent(agent: SwarmAgentDef, action: string) {
    await this.emit({
      type: "agent_start",
      agentKey: agent.key,
      agentName: agent.name,
      layer: agent.layer,
      content: personalAgentPreamble(agent.name, agent.voice),
    });
    await this.emit({
      type: "agent_thinking",
      agentKey: agent.key,
      agentName: agent.name,
      layer: agent.layer,
      content: action,
    });
    await this.emit({
      type: "agent_complete",
      agentKey: agent.key,
      agentName: agent.name,
      layer: agent.layer,
    });
  }

  private looksAmbiguous(msg: string): boolean {
    const lower = msg.toLowerCase().trim();
    if (lower.length < 40) return true;
    const vague = ["make an app", "build something", "create a site", "help me"];
    return vague.some((v) => lower.includes(v));
  }
}

export const genesis = new GenesisOrchestrator();
