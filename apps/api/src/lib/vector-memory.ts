/**
 * Boss Built — Vector project memory
 * Embeddings via OpenRouter; cosine retrieval for optimized context injection.
 */
import { randomUUID } from "node:crypto";

export interface MemoryChunk {
  id: string;
  projectId: string;
  text: string;
  kind: "summary" | "decision" | "task" | "rejection" | "note" | "file" | "chat";
  embedding: number[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const store = new Map<string, MemoryChunk[]>(); // projectId → chunks

const apiKey = () => process.env.OPENROUTER_API_KEY;

/** OpenAI-compatible embeddings through OpenRouter */
export async function embed(texts: string[]): Promise<number[][]> {
  const key = apiKey();
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.BOSS_APP_URL ?? "http://localhost:5173",
      "X-Title": "Boss Built",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embeddings ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export async function addMemoryChunks(
  projectId: string,
  items: Array<{ text: string; kind: MemoryChunk["kind"]; metadata?: Record<string, unknown> }>
): Promise<MemoryChunk[]> {
  const filtered = items.filter((i) => i.text.trim().length > 0);
  if (!filtered.length) return [];

  let embeddings: number[][];
  try {
    embeddings = await embed(filtered.map((i) => i.text.slice(0, 8000)));
  } catch (err) {
    console.warn("[vector-memory] embed failed, storing without vectors", err);
    embeddings = filtered.map(() => []);
  }

  const list = store.get(projectId) ?? [];
  const created: MemoryChunk[] = filtered.map((item, i) => ({
    id: randomUUID(),
    projectId,
    text: item.text,
    kind: item.kind,
    embedding: embeddings[i] ?? [],
    createdAt: new Date().toISOString(),
    metadata: item.metadata,
  }));

  list.push(...created);
  // Cap per project to keep memory tight
  if (list.length > 200) {
    list.splice(0, list.length - 200);
  }
  store.set(projectId, list);
  return created;
}

export async function retrieveRelevant(
  projectId: string,
  query: string,
  opts: { topK?: number; minScore?: number } = {}
): Promise<Array<MemoryChunk & { score: number }>> {
  const topK = opts.topK ?? 8;
  const minScore = opts.minScore ?? 0.25;
  const list = store.get(projectId) ?? [];
  if (!list.length) return [];

  let qEmb: number[];
  try {
    qEmb = (await embed([query.slice(0, 4000)]))[0] ?? [];
  } catch {
    // Fallback: recency + keyword overlap
    const q = query.toLowerCase();
    return list
      .map((c) => ({
        ...c,
        score:
          (c.text.toLowerCase().includes(q.slice(0, 40)) ? 0.5 : 0) +
          Math.min(0.4, c.text.length / 2000),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  if (!qEmb.length) {
    return list.slice(-topK).map((c) => ({ ...c, score: 0 }));
  }

  return list
    .map((c) => ({
      ...c,
      score: c.embedding.length ? cosine(qEmb, c.embedding) : 0,
    }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function formatMemoryForPrompt(
  chunks: Array<MemoryChunk & { score?: number }>,
  maxChars = 3500
): string {
  if (!chunks.length) return "(no relevant memory)";
  const lines: string[] = [];
  let used = 0;
  for (const c of chunks) {
    const line = `[${c.kind}] ${c.text}`.trim();
    if (used + line.length + 1 > maxChars) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join("\n");
}

export function getProjectChunkCount(projectId: string): number {
  return store.get(projectId)?.length ?? 0;
}
