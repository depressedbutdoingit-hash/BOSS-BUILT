/** Core domain types for Nexus Elite Studio v2 */

export type UserRole = "owner" | "builder" | "viewer" | "admin";

export type ProjectStatus =
  | "draft"
  | "planning"
  | "building"
  | "reviewing"
  | "deploying"
  | "live"
  | "failed"
  | "archived";

export type BuildKind = "initial" | "rebuild" | "chat_change" | "chat_only" | "repair";

export type DeploymentProvider = "vercel" | "github" | "render" | "custom";

export interface ProjectMemory {
  summary: string;
  completedTasks: string[];
  decisions: Array<{ decision: string; reason: string; at: string }>;
  rejectedApproaches: string[];
  brandTokens?: Record<string, string>;
  styleGuide?: string;
  architectureNotes?: string;
  lastUpdated: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  projectId?: string;
  kind: BuildKind | "chat" | "deploy" | "export";
  tokensIn: number;
  tokensOut: number;
  model: string;
  costUsd?: number;
  createdAt: string;
}

export interface SwarmStepEvent {
  type:
    | "agent_start"
    | "agent_thinking"
    | "agent_tool"
    | "agent_message"
    | "agent_complete"
    | "layer_start"
    | "layer_complete"
    | "question"
    | "decision"
    | "file_write"
    | "file_edit"
    | "preview_update"
    | "guardian_finding"
    | "error"
    | "done";
  agentKey?: string;
  agentName?: string;
  layer?: number;
  content?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}
