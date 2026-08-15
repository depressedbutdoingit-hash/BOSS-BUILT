export interface MemoryFact {
  kind: string;
  text: string;
  score?: number;
}

export function MemoryInspector({
  facts,
  summary,
}: {
  facts: MemoryFact[];
  summary?: string;
}) {
  return (
    <div className="panel" style={{ maxHeight: 160 }}>
      <div className="panel-title">VECTOR MEMORY</div>
      <div style={{ padding: "8px 10px", overflow: "auto", fontSize: 10, maxHeight: 120 }}>
        {summary && (
          <div style={{ marginBottom: 8, color: "hsl(42 95% 52%)" }}>
            <strong>summary</strong> · {summary}
          </div>
        )}
        {facts.length === 0 ? (
          <div style={{ color: "hsl(40 5% 45%)" }}>
            Retrieved chunks show here after Genesis packs context.
          </div>
        ) : (
          facts.map((f, i) => (
            <div
              key={i}
              style={{
                marginBottom: 6,
                borderLeft: "2px solid hsl(220 8% 40%)",
                paddingLeft: 8,
                color: "hsl(220 8% 78%)",
              }}
            >
              <span style={{ color: "hsl(42 80% 50%)" }}>[{f.kind}]</span>{" "}
              {f.text.slice(0, 160)}
              {f.text.length > 160 ? "…" : ""}
              {f.score != null && (
                <span style={{ opacity: 0.45, marginLeft: 6 }}>
                  {(f.score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
