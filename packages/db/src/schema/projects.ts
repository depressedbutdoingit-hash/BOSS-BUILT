import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  stack: text("stack").default("vite-react"),
  /** Persistent project memory — compounds across builds */
  memory: jsonb("memory").$type<{
    summary: string;
    completedTasks: string[];
    decisions: Array<{ decision: string; reason: string; at: string }>;
    rejectedApproaches: string[];
    brandTokens?: Record<string, string>;
    styleGuide?: string;
    architectureNotes?: string;
    lastUpdated: string;
  }>(),
  /** Latest generated code snapshot (or pointer) */
  generatedCode: text("generated_code"),
  deploymentUrl: text("deployment_url"),
  deploymentProvider: text("deployment_provider"),
  githubRepo: text("github_repo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
