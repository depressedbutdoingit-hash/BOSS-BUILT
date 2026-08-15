/**
 * Vercel deployment via REST API (static / framework file upload).
 * Docs: POST https://api.vercel.com/v13/deployments
 */

export interface VercelFile {
  file: string;
  data: string; // utf-8 text or base64 for binary — we send utf-8 text files
}

export interface VercelDeployResult {
  id: string;
  url: string;
  readyState: string;
  inspectorUrl?: string;
}

export async function deployToVercel(opts: {
  token: string;
  name: string;
  files: Array<{ path: string; content: string }>;
  projectName?: string;
  target?: "production" | "preview";
}): Promise<VercelDeployResult> {
  const files: VercelFile[] = opts.files.map((f) => ({
    file: f.path.replace(/^\/+/, ""),
    data: f.content,
  }));

  // Ensure something deployable
  if (!files.some((f) => f.file === "index.html" || f.file.endsWith(".html"))) {
    files.unshift({
      file: "index.html",
      data: `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${opts.name}</title></head><body style="font-family:system-ui;background:#0a0a0a;color:#e8e0d0;padding:2rem"><h1>${opts.name}</h1><p>Deployed by Boss Built.</p><pre style="opacity:.7">${files
        .map((x) => x.file)
        .join("\n")}</pre></body></html>`,
    });
  }

  const body = {
    name: (opts.projectName ?? opts.name).slice(0, 100),
    files,
    projectSettings: {
      framework: null,
    },
    target: opts.target ?? "production",
  };

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `Vercel ${res.status}: ${JSON.stringify(data).slice(0, 400)}`
    );
  }

  const url =
    typeof data.url === "string"
      ? data.url.startsWith("http")
        ? data.url
        : `https://${data.url}`
      : "";

  return {
    id: String(data.id ?? data.uid ?? ""),
    url,
    readyState: String(data.readyState ?? "QUEUED"),
    inspectorUrl:
      typeof data.inspectorUrl === "string" ? data.inspectorUrl : undefined,
  };
}

export async function getVercelDeployment(
  token: string,
  id: string
): Promise<{ readyState: string; url?: string }> {
  const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Vercel status ${res.status}`);
  }
  const url =
    typeof data.url === "string"
      ? data.url.startsWith("http")
        ? data.url
        : `https://${data.url}`
      : undefined;
  return { readyState: String(data.readyState ?? "UNKNOWN"), url };
}
