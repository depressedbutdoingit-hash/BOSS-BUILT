import { useCallback, useMemo, useState } from "react";
import { SwarmGrid } from "./components/SwarmGrid";
import { Terminal, type TermLine } from "./components/Terminal";
import { FilePreview, type PreviewFile } from "./components/FilePreview";
import { MemoryInspector, type MemoryFact } from "./components/MemoryInspector";
import { playDemoSequence } from "./lib/demo";
import {
  createProject,
  isLoggedIn,
  register,
  streamChat,
  exportProject,
  downloadExport,
  downloadZip,
  deployToVercel,
  deployToGitHub,
  fetchMemory,
  pollVercelDeploy,
  startCheckout,
  devActivatePlan,
  type Project,
} from "./lib/api";

type Mode = "demo" | "live";

export default function App() {
  const [lines, setLines] = useState<TermLine[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState("idle");
  const [mode, setMode] = useState<Mode>("demo");
  const [project, setProject] = useState<Project | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>([]);
  const [memorySummary, setMemorySummary] = useState<string | undefined>();

  const pushLine = useCallback((line: Omit<TermLine, "id">) => {
    setLines((prev) => [...prev, { ...line, id: `${Date.now()}-${Math.random()}` }]);
  }, []);

  const upsertFile = useCallback((path: string, lines?: number, content?: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.path === path);
      if (idx === -1) {
        return [...prev, { path, lines, content }];
      }
      const next = [...prev];
      next[idx] = {
        ...next[idx]!,
        lines: lines ?? next[idx]!.lines,
        content: content ?? next[idx]!.content,
      };
      return next;
    });
    setSelectedFile((cur) => cur ?? path);
  }, []);

  const handleEvent = useCallback(
    (ev: Record<string, unknown>) => {
      const type = String(ev.type ?? "");
      const agentKey = ev.agentKey ? String(ev.agentKey) : undefined;
      const agentName = ev.agentName ? String(ev.agentName) : undefined;
      const content = ev.content ? String(ev.content) : "";

      if (type === "agent_start" && agentKey) {
        setActive((s) => new Set(s).add(agentKey));
        if (content) pushLine({ kind: "message", agent: short(agentName), text: content });
      } else if (type === "agent_complete" && agentKey) {
        setActive((s) => {
          const n = new Set(s);
          n.delete(agentKey);
          return n;
        });
        setDone((s) => new Set(s).add(agentKey));
      } else if (type === "agent_thinking") {
        pushLine({ kind: "thinking", agent: short(agentName), text: content || "…" });
        // Parse "N memory hits" from sovereign thinking lines
        const hit = content.match(/(\d+)\s+memory hits/i);
        if (hit) {
          setMemoryFacts((prev) => {
            if (prev.length) return prev;
            return [
              {
                kind: "retrieve",
                text: `Context pack reported ${hit[1]} relevant memory chunk(s) for this turn.`,
              },
            ];
          });
        }
      } else if (type === "agent_message") {
        pushLine({ kind: "message", agent: short(agentName), text: content });
      } else if (type === "question") {
        pushLine({ kind: "question", agent: short(agentName), text: content });
        setWaiting(true);
      } else if (type === "decision") {
        pushLine({ kind: "system", agent: short(agentName), text: content });
        setMemoryFacts((prev) => [
          ...prev,
          { kind: "decision", text: content.slice(0, 240) },
        ]);
        if (content.toLowerCase().includes("brief") || content.toLowerCase().includes("stack")) {
          setMemorySummary(content.slice(0, 120));
        }
      } else if (type === "file_write") {
        const data = (ev.data ?? {}) as {
          status?: string;
          path?: string;
          lines?: number;
          content?: string;
        };
        const path = data.path ?? content;
        if (data.status === "wrote") {
          pushLine({
            kind: "file",
            text: `✦ wrote  ${path}  ${data.lines ? `· ${data.lines} lines` : ""}`,
          });
          upsertFile(path, data.lines, data.content);
        } else {
          pushLine({ kind: "file", text: `✦ writing  ${path}` });
          upsertFile(path);
        }
      } else if (type === "guardian_finding") {
        pushLine({ kind: "finding", agent: short(agentName), text: content });
        setMemoryFacts((prev) => [...prev, { kind: "finding", text: content.slice(0, 200) }]);
      } else if (type === "layer_start") {
        pushLine({ kind: "system", text: `—— ${content} ——` });
        setStatus(content);
      } else if (type === "layer_complete") {
        pushLine({ kind: "system", text: content });
      } else if (type === "error") {
        pushLine({ kind: "error", text: content });
        setBusy(false);
      } else if (type === "done") {
        setBusy(false);
        setStatus("complete");
        const data = ev.data as {
          awaitingUser?: boolean;
          files?: string[];
        } | undefined;
        if (data?.awaitingUser) setWaiting(true);
        if (data?.files?.length) {
          for (const p of data.files) upsertFile(p);
        }
        if (content) pushLine({ kind: "system", text: content });
      }
    },
    [pushLine, upsertFile]
  );

  const ensureLiveSession = async () => {
    if (project) return project;
    setBootError(null);
    try {
      if (!isLoggedIn()) {
        const email = `builder_${Date.now()}@bossbuilt.local`;
        await register(email, "Builder", "bossbuilt-dev");
      }
      const p = await createProject({
        name: "Studio Session",
        description: "Live Genesis session from Boss Built terminal",
        stack: "vite-react",
      });
      setProject(p);
      localStorage.setItem("boss_project_id", p.id);
      return p;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start live session";
      setBootError(msg);
      throw err;
    }
  };

  const runDemo = async () => {
    setMode("demo");
    setBusy(true);
    setWaiting(false);
    setLines([]);
    setActive(new Set());
    setDone(new Set());
    setFiles([]);
    setSelectedFile(null);
    setMemoryFacts([]);
    setMemorySummary(undefined);
    setStatus("demo sequence");
    await playDemoSequence(handleEvent);
    setBusy(false);
    setStatus("demo complete");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const msg = input.trim();
    pushLine({ kind: "message", agent: "YOU", text: msg });
    setInput("");
    setWaiting(false);
    setBusy(true);

    if (mode === "demo" && !project) {
      await runDemo();
      return;
    }

    try {
      setMode("live");
      const p = await ensureLiveSession();
      setStatus("genesis live");
      await streamChat(p.id, msg, handleEvent);
      try {
        const mem = await fetchMemory(p.id, msg);
        setMemoryFacts(
          mem.chunks.map((c) => ({ kind: c.kind, text: c.text, score: c.score }))
        );
        const pm = mem.projectMemory as { summary?: string } | null;
        if (pm?.summary) setMemorySummary(pm.summary);
      } catch {
        /* non-fatal */
      }
    } catch (err) {
      pushLine({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Stream failed — is the API running on :3001?",
      });
      setBusy(false);
      setStatus("error");
    }
  };


  const handleExportError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Export failed";
    if (msg.includes("EXPORT_LOCKED") || msg.includes("monthly subscription") || msg.includes("402")) {
      pushLine({
        kind: "error",
        text: "Export locked — upgrade to Pro or Elite to unlock ZIP / GitHub and take apps off the platform.",
      });
      pushLine({
        kind: "system",
        text: "Tip: use VERCEL for live hosting on Boss Built. ZIP/GITHUB need Pro or Elite.",
      });
      return;
    }
    pushLine({ kind: "error", text: msg });
  };

  const onSubscribe = async (planId: "starter" | "pro" | "elite" = "pro") => {
    try {
      const session = await ensureLiveSession();
      void session;
      try {
        const { url } = await startCheckout(planId);
        pushLine({ kind: "system", text: `Opening monthly checkout (${planId})…` });
        window.open(url, "_blank");
      } catch {
        // Stripe not configured — dev activate
        await devActivatePlan(planId);
        const note =
          planId === "pro" || planId === "elite"
            ? "Export (ZIP / GitHub) unlocked."
            : planId === "starter"
              ? "Starter active — platform hosting only. Pro/Elite unlock export."
              : "Unsubscribed — export locked.";
        pushLine({ kind: "system", text: `Dev plan activated: ${planId}. ${note}` });
      }
    } catch (err) {
      pushLine({ kind: "error", text: err instanceof Error ? err.message : "Subscribe failed" });
    }
  };

  const onZip = async () => {
    if (!project) {
      pushLine({ kind: "error", text: "No live project — run a LIVE build first." });
      return;
    }
    try {
      await downloadZip(project.id);
      pushLine({ kind: "system", text: "ZIP downloaded." });
    } catch (err) {
      handleExportError(err);
    }
  };

  const onDeployVercel = async () => {
    if (!project) {
      pushLine({ kind: "error", text: "No live project — run a LIVE build first." });
      return;
    }
    pushLine({ kind: "system", text: "Deploying to Vercel…" });
    try {
      const result = await deployToVercel(project.id);
      pushLine({
        kind: "system",
        text: `Vercel ${result.readyState}: ${result.url || result.id}`,
      });
      // Poll until READY or ERROR (max ~60s)
      if (result.id) {
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          try {
            const st = await pollVercelDeploy(project.id, result.id);
            pushLine({
              kind: "system",
              text: `Vercel status: ${st.readyState}${st.url ? ` · ${st.url}` : ""}`,
            });
            if (st.readyState === "READY" || st.readyState === "ERROR" || st.readyState === "CANCELED") {
              break;
            }
          } catch {
            break;
          }
        }
      }
    } catch (err) {
      pushLine({
        kind: "error",
        text: err instanceof Error ? err.message : "Vercel deploy failed",
      });
    }
  };

  const onDeployGitHub = async () => {
    if (!project) {
      pushLine({ kind: "error", text: "No live project — run a LIVE build first." });
      return;
    }
    pushLine({ kind: "system", text: "Pushing to GitHub…" });
    try {
      const result = await deployToGitHub(project.id);
      pushLine({
        kind: "system",
        text: `GitHub: ${result.repoUrl} (${result.filesWritten} files)`,
      });
    } catch (err) {
      handleExportError(err);
    }
  };

  const onExport = async () => {
    if (!project) {
      pushLine({ kind: "error", text: "No live project yet — run LIVE build first." });
      return;
    }
    try {
      const bundle = await exportProject(project.id);
      if (bundle.files?.length) {
        setFiles(bundle.files.map((f) => ({ path: f.path, content: f.content, lines: f.content.split("\n").length })));
      }
      downloadExport(bundle);
      pushLine({ kind: "system", text: `Export ready · ${bundle.files.length} file(s) downloaded.` });
    } catch (err) {
      handleExportError(err);
    }
  };

  const stats = useMemo(
    () => ({
      active: active.size,
      done: done.size,
      lines: lines.length,
      files: files.length,
    }),
    [active, done, lines, files]
  );

  return (
    <div className="app">
      <header className="header glass">
        <div>
          <h1 className="glow">Boss Built</h1>
          <div className="tag">
            Genesis Swarm · {mode === "live" ? "LIVE" : "DEMO"} · Black · Gold · Chrome
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMode("live")}
            disabled={busy}
            style={btnStyle(mode === "live")}
          >
            LIVE
          </button>
          <button type="button" onClick={runDemo} disabled={busy} style={btnStyle(mode === "demo")}>
            {busy && mode === "demo" ? "RUNNING…" : "PLAY DEMO"}
          </button>
          <button type="button" onClick={onZip} disabled={busy} style={btnStyle(false)}>
            ZIP
          </button>
          <button type="button" onClick={onDeployVercel} disabled={busy} style={btnStyle(false)}>
            VERCEL
          </button>
          <button type="button" onClick={onDeployGitHub} disabled={busy} style={btnStyle(false)}>
            GITHUB
          </button>
          <button type="button" onClick={onExport} disabled={busy} style={btnStyle(false)}>
            JSON
          </button>
          <button type="button" onClick={() => onSubscribe("pro")} disabled={busy} style={btnStyle(false)}>
            SUBSCRIBE
          </button>
        </div>
      </header>

      <div className="main main-wide">
        <aside className="panel left-col">
          <div className="panel-title">HYDRA-PRIME · 7 LAYERS</div>
          <SwarmGrid active={active} done={done} />
          <MemoryInspector facts={memoryFacts} summary={memorySummary} />
        </aside>

        <section className="panel" style={{ minHeight: 420 }}>
          <div className="panel-title">LIVE TERMINAL</div>
          <Terminal lines={lines} streaming={busy} />
          {bootError && (
            <div style={{ padding: "6px 12px", color: "hsl(0 75% 55%)", fontSize: 11 }}>
              {bootError}
            </div>
          )}
          <form className="composer" onSubmit={onSubmit}>
            <input
              className={waiting ? "waiting" : ""}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                waiting
                  ? "Your move — answer SOVEREIGN to continue…"
                  : mode === "live"
                    ? "Talk to Genesis — SOVEREIGN is listening…"
                    : "Describe what you want Boss Built to create…"
              }
              disabled={busy && !waiting}
            />
            <button type="submit" disabled={busy && !waiting}>
              SEND
            </button>
          </form>
        </section>

        <div className="right-col">
          <FilePreview files={files} selected={selectedFile} onSelect={setSelectedFile} />
        </div>
      </div>

      <div className="status-bar">
        <span>
          status <strong>{status}</strong>
        </span>
        <span>
          mode <strong>{mode}</strong>
        </span>
        <span>
          active <strong>{stats.active}</strong>
        </span>
        <span>
          done <strong>{stats.done}</strong>
        </span>
        <span>
          files <strong>{stats.files}</strong>
        </span>
        <span>
          memory <strong>vector</strong>
        </span>
      </div>
    </div>
  );
}

function short(name?: string) {
  if (!name) return undefined;
  if (name === "SOVEREIGN") return "SOV";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    background: active
      ? "linear-gradient(180deg, hsl(42 95% 56%), hsl(42 90% 42%))"
      : "transparent",
    border: "1px solid hsl(42 95% 52% / 0.5)",
    color: active ? "hsl(0 0% 5%)" : "hsl(42 95% 52%)",
    padding: "6px 12px",
    fontFamily: "Orbitron, sans-serif",
    fontSize: 10,
    letterSpacing: "0.1em",
    cursor: "pointer",
    fontWeight: 700,
  };
}
