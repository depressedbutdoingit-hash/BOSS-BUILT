import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  real,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

/** Vector memory chunks per project */
export const memoryChunks = pgTable("memory_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // summary | decision | task | note | file | chat
  text: text("text").notNull(),
  embedding: jsonb("embedding").$type<number[]>(),
  score: real("score"),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
