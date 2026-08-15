/**
 * Boss Built API client — auth + projects + SSE chat stream
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  stack: string;
  memory: unknown;
  generatedCode: string | null;
}

function authHeaders(token?: string | null): HeadersInit {
  const t = token ?? localStorage.getItem("boss_token");
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export async function register(email: string, name: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.toString?.() ?? data.error ?? "Register failed");
  localStorage.setItem("boss_token", data.token);
  return data as { token: string; user: User };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  localStorage.setItem("boss_token", data.token);
  return data as { token: string; user: User };
}

export async function createProject(input: {
  name: string;
  description: string;
  stack?: string;
}) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Create project failed");
  return data.project as Project;
}

export async function listProjects() {
  const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "List failed");
  return data.projects as Project[];
}

/**
 * Stream Genesis events over SSE (POST + fetch reader).
 */
export async function streamChat(
  projectId: string,
  message: string,
  onEvent: (ev: Record<string, unknown>) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Chat failed (${res.status})`);
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      try {
        onEvent(JSON.parse(json));
      } catch {
        /* skip malformed */
      }
    }
  }
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem("boss_token"));
}

export function logout() {
  localStorage.removeItem("boss_token");
  localStorage.removeItem("boss_project_id");
}


export async function exportProject(projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/export`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Export failed");
  return data as {
    name: string;
    files: Array<{ path: string; content: string }>;
    memory: unknown;
    exportedAt: string;
  };
}

/** Trigger browser download of export as JSON (zip comes in Phase 4) */
export function downloadExport(bundle: {
  name: string;
  files: Array<{ path: string; content: string }>;
}) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bundle.name || "boss-built"}-export.json`;
  a.click();
  URL.revokeObjectURL(url);
}


export async function downloadZip(projectId: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/export.zip`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string; message?: string };
    throw new Error(err.code === "EXPORT_LOCKED" ? (err.message ?? err.error ?? "EXPORT_LOCKED") : (err.error ?? "Zip export failed"));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boss-built-${projectId.slice(0, 8)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deployToVercel(projectId: string, token?: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/deploy/vercel`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(token ? { token } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Vercel deploy failed");
  return data as { id: string; url: string; readyState: string; provider: string };
}

export async function deployToGitHub(projectId: string, token?: string) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/deploy/github`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(token ? { token } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "GitHub push failed");
  return data as {
    provider: string;
    repoUrl: string;
    owner: string;
    repo: string;
    filesWritten: number;
  };
}


export async function fetchMemory(projectId: string, q?: string) {
  const url = new URL(`${API_BASE}/projects/${projectId}/memory`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Memory fetch failed");
  return data as {
    count: number;
    query: string;
    chunks: Array<{ id: string; kind: string; text: string; score: number; createdAt: string }>;
    projectMemory: unknown;
  };
}


export async function pollVercelDeploy(projectId: string, deploymentId: string) {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/deploy/vercel/${deploymentId}`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Poll failed");
  return data as { readyState: string; url?: string };
}

/** Billing */
export async function listPlans() {
  const res = await fetch(`${API_BASE}/billing/plans`);
  return res.json() as Promise<{
    plans: Array<{
      id: string;
      name: string;
      priceMonthlyUsd: number;
      blurb: string;
      fullExport: boolean;
      platformHost: boolean;
    }>;
    rule: { hosting: string; export: string };
  }>;
}

export async function billingMe() {
  const res = await fetch(`${API_BASE}/billing/me`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Billing me failed");
  return data as {
    plan: string;
    planName: string;
    entitlements: { fullExport: boolean; platformHost: boolean };
    message: string;
  };
}

export async function startCheckout(planId: "starter" | "pro" | "elite" = "pro") {
  const res = await fetch(`${API_BASE}/billing/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ planId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Checkout failed");
  return data as { url: string; plan: string; interval: string };
}

export async function openBillingPortal() {
  const res = await fetch(`${API_BASE}/billing/portal`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Portal failed");
  return data as { url: string };
}

/** Dev helper when Stripe keys are not set */
export async function devActivatePlan(planId: string) {
  const res = await fetch(`${API_BASE}/billing/dev/activate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ planId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Activate failed");
  return data;
}
