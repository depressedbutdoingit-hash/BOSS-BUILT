import { z } from "zod";

export const projectMemorySchema = z.object({
  summary: z.string().default(""),
  completedTasks: z.array(z.string()).default([]),
  decisions: z
    .array(
      z.object({
        decision: z.string(),
        reason: z.string(),
        at: z.string(),
      })
    )
    .default([]),
  rejectedApproaches: z.array(z.string()).default([]),
  brandTokens: z.record(z.string()).optional(),
  styleGuide: z.string().optional(),
  architectureNotes: z.string().optional(),
  lastUpdated: z.string(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
  stack: z
    .enum(["nextjs", "vite-react", "remix", "astro", "custom"])
    .default("vite-react"),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(12000),
  projectId: z.string().uuid(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
