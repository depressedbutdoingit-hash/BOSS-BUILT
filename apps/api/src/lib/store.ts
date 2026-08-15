/**
 * Boss Built store — Postgres (Drizzle) when DATABASE_URL is set,
 * otherwise in-memory fallback for local/dev without a database.
 */
import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword } from "./password.js";

export interface ProjectMemory {
  summary: string;
  completedTasks: string[];
  decisions: Array<{ decision: string; reason: string; at: string }>;
  rejectedApproaches: string[];
  lastUpdated: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: string;
  stack: string;
  memory: ProjectMemory | null;
  generatedCode: string | null;
  deploymentUrl: string | null;
  githubRepo: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Memory fallback ───────────────────────────────────────────
const memUsers = new Map<string, UserRecord>();
const memProjects = new Map<string, ProjectRecord>();
const memEmail = new Map<string, string>();

function emptyMemory(now: string): ProjectMemory {
  return {
    summary: "",
    completedTasks: [],
    decisions: [],
    rejectedApproaches: [],
    lastUpdated: now,
  };
}

async function tryDb() {
  try {
    const mod = await import("@boss/db");
    if (!mod.isDbConfigured()) return null;
    return mod.getDb();
  } catch {
    return null;
  }
}

function mapUser(row: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: Date | string;
}): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? "",
    passwordHash: row.passwordHash,
    role: row.role,
    plan: row.plan,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    subscriptionStatus: row.subscriptionStatus,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString(),
  };
}

function mapProject(row: {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  stack: string | null;
  memory: ProjectMemory | null;
  generatedCode: string | null;
  deploymentUrl: string | null;
  githubRepo: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description ?? "",
    status: row.status,
    stack: row.stack ?? "vite-react",
    memory: row.memory,
    generatedCode: row.generatedCode,
    deploymentUrl: row.deploymentUrl,
    githubRepo: row.githubRepo,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString(),
    updatedAt:
      typeof row.updatedAt === "string"
        ? row.updatedAt
        : row.updatedAt.toISOString(),
  };
}

export const store = {
  async createUser(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<UserRecord> {
    const email = input.email.toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const db = await tryDb();

    if (db) {
      const { users } = await import("@boss/db");
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing[0]) throw new Error("Email already registered");

      const [row] = await db
        .insert(users)
        .values({
          email,
          name: input.name,
          passwordHash,
          role: "builder",
          plan: "none",
        })
        .returning();
      return mapUser(row!);
    }

    if (memEmail.has(email)) throw new Error("Email already registered");
    const user: UserRecord = {
      id: randomUUID(),
      email,
      name: input.name,
      passwordHash,
      role: "builder",
      plan: "none",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      createdAt: new Date().toISOString(),
    };
    memUsers.set(user.id, user);
    memEmail.set(email, user.id);
    return user;
  },

  async findUserByEmail(email: string): Promise<UserRecord | undefined> {
    const key = email.toLowerCase();
    const db = await tryDb();
    if (db) {
      const { users } = await import("@boss/db");
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, key))
        .limit(1);
      return rows[0] ? mapUser(rows[0]) : undefined;
    }
    const id = memEmail.get(key);
    return id ? memUsers.get(id) : undefined;
  },

  async findUserById(id: string): Promise<UserRecord | undefined> {
    const db = await tryDb();
    if (db) {
      const { users } = await import("@boss/db");
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0] ? mapUser(rows[0]) : undefined;
    }
    return memUsers.get(id);
  },

  async updateUser(
    id: string,
    patch: Partial<
      Pick<
        UserRecord,
        | "plan"
        | "stripeCustomerId"
        | "stripeSubscriptionId"
        | "subscriptionStatus"
        | "name"
      >
    >
  ): Promise<UserRecord | undefined> {
    const db = await tryDb();
    if (db) {
      const { users } = await import("@boss/db");
      const [row] = await db
        .update(users)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      return row ? mapUser(row) : undefined;
    }
    const u = memUsers.get(id);
    if (!u) return undefined;
    const updated = { ...u, ...patch };
    memUsers.set(id, updated);
    return updated;
  },

  async createProject(input: {
    userId: string;
    name: string;
    description: string;
    stack?: string;
  }): Promise<ProjectRecord> {
    const now = new Date().toISOString();
    const memory = emptyMemory(now);
    const db = await tryDb();

    if (db) {
      const { projects } = await import("@boss/db");
      const [row] = await db
        .insert(projects)
        .values({
          userId: input.userId,
          name: input.name,
          description: input.description,
          status: "draft",
          stack: input.stack ?? "vite-react",
          memory,
        })
        .returning();
      return mapProject(row!);
    }

    const project: ProjectRecord = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      description: input.description,
      status: "draft",
      stack: input.stack ?? "vite-react",
      memory,
      generatedCode: null,
      deploymentUrl: null,
      githubRepo: null,
      createdAt: now,
      updatedAt: now,
    };
    memProjects.set(project.id, project);
    return project;
  },

  async listProjects(userId: string): Promise<ProjectRecord[]> {
    const db = await tryDb();
    if (db) {
      const { projects } = await import("@boss/db");
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
      return rows.map(mapProject);
    }
    return [...memProjects.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getProject(
    id: string,
    userId?: string
  ): Promise<ProjectRecord | undefined> {
    const db = await tryDb();
    if (db) {
      const { projects } = await import("@boss/db");
      const rows = await db
        .select()
        .from(projects)
        .where(
          userId
            ? and(eq(projects.id, id), eq(projects.userId, userId))
            : eq(projects.id, id)
        )
        .limit(1);
      return rows[0] ? mapProject(rows[0]) : undefined;
    }
    const p = memProjects.get(id);
    if (!p) return undefined;
    if (userId && p.userId !== userId) return undefined;
    return p;
  },

  async updateProject(
    id: string,
    patch: Partial<
      Pick<
        ProjectRecord,
        | "name"
        | "description"
        | "status"
        | "memory"
        | "generatedCode"
        | "deploymentUrl"
        | "githubRepo"
      >
    >
  ): Promise<ProjectRecord | undefined> {
    const db = await tryDb();
    if (db) {
      const { projects } = await import("@boss/db");
      const [row] = await db
        .update(projects)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();
      return row ? mapProject(row) : undefined;
    }
    const p = memProjects.get(id);
    if (!p) return undefined;
    const updated = { ...p, ...patch, updatedAt: new Date().toISOString() };
    memProjects.set(id, updated);
    return updated;
  },

  /** True when backed by Postgres */
  async usingPostgres(): Promise<boolean> {
    return Boolean(await tryDb());
  },
};
