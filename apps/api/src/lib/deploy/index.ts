import { buildExportExtras } from "./templates.js";
export * from "./zip.js";
export * from "./vercel.js";
export * from "./github.js";

export function parseProjectFiles(
  generatedCode: string | null
): Array<{ path: string; content: string }> {
  if (!generatedCode) return [];
  try {
    const parsed = JSON.parse(generatedCode);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (f) => f && typeof f.path === "string" && typeof f.content === "string"
      );
    }
  } catch {
    return [{ path: "output.txt", content: generatedCode }];
  }
  return [];
}

export function ensureDeployable(
  name: string,
  files: Array<{ path: string; content: string }>
): Array<{ path: string; content: string }> {
  const out = [...files];
  // Ownership pack: Actions, package.json, gitignore, README
  const extras = buildExportExtras(name, out);
  for (const e of extras) {
    if (!out.some((f) => f.path === e.path)) out.push(e);
  }
  if (!out.some((f) => f.path.endsWith(".html"))) {
    out.unshift({
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${name}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0a0a0a;color:#e8e0d0;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{max-width:560px;padding:2rem;border:1px solid #3d3420;background:#111}
h1{color:#d4a017;margin:0 0 .5rem;letter-spacing:.06em}
p{opacity:.75;line-height:1.5}
code{color:#c0c0c0}
</style>
</head>
<body>
<div class="card">
  <h1>${name}</h1>
  <p>Deployed by <strong>Boss Built</strong> Genesis Swarm.</p>
  <p><code>${out.map((f) => f.path).join(", ") || "bundle"}</code></p>
</div>
</body>
</html>`,
    });
  }
  return out;
}
