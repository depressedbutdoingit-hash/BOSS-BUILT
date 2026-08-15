import { useEffect, useRef } from "react";

export interface TermLine {
  id: string;
  kind: "message" | "question" | "file" | "finding" | "system" | "error" | "thinking";
  agent?: string;
  text: string;
}

export function Terminal({ lines, streaming }: { lines: TermLine[]; streaming?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="terminal">
      {lines.length === 0 && (
        <div className="line" style={{ color: "hsl(240 5% 45%)" }}>
          Boss Built terminal ready. Describe what you want to build — SOVEREIGN will meet you here.
        </div>
      )}
      {lines.map((l) => (
        <div key={l.id} className={`line ${l.kind}`}>
          {l.agent && <span className="meta">[{l.agent}]</span>}
          <span style={{ whiteSpace: "pre-wrap" }}>{l.text}</span>
        </div>
      ))}
      {streaming && <span className="cursor" />}
      <div ref={endRef} />
    </div>
  );
}
